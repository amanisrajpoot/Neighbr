import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.community.models import CommunityPost, PostComment, CommunityPoll, PollVote
from app.modules.community.repository import CommunityRepository
from app.modules.community.events import (
    POST_CREATED,
    POST_COMMENT_ADDED,
    POST_LIKED,
    POLL_CREATED,
    POLL_VOTED,
)
from app.modules.community.schemas import (
    PostCreate,
    PostCommentCreate,
    PollCreate,
    PollVoteRequest,
    PollOptionStats,
    PollOut,
)

class CommunityService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CommunityRepository(db)

    async def create_post(
        self, society_id: uuid.UUID, payload: PostCreate, author: User
    ) -> CommunityPost:
        post = CommunityPost(
            society_id=society_id,
            author_id=author.id,
            unit_id=payload.unit_id,
            title=payload.title.strip(),
            content=payload.content.strip(),
            category=payload.category,
            images=payload.images,
        )
        await self.repo.save(post)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(author.id),
                event_type=POST_CREATED,
                entity_type="community_post",
                entity_id=str(post.id),
                payload={"title": post.title, "category": post.category},
            )
        )
        return post

    async def list_posts(
        self, society_id: uuid.UUID, category: str | None = None
    ) -> list[CommunityPost]:
        return await self.repo.list_posts(society_id, category)

    async def add_comment(
        self, society_id: uuid.UUID, post_id: uuid.UUID, payload: PostCommentCreate, author: User
    ) -> PostComment:
        post = await self.repo.get_post(society_id, post_id)
        if not post:
            raise AppException(code="POST_NOT_FOUND", message="Post not found", status_code=404)

        comment = PostComment(
            post_id=post.id,
            author_id=author.id,
            content=payload.content.strip(),
        )
        await self.repo.save(comment)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(author.id),
                event_type=POST_COMMENT_ADDED,
                entity_type="community_post",
                entity_id=str(post.id),
                payload={"comment_id": str(comment.id)},
            )
        )
        return comment

    async def like_post(self, society_id: uuid.UUID, post_id: uuid.UUID, user: User) -> int:
        post = await self.repo.get_post(society_id, post_id)
        if not post:
            raise AppException(code="POST_NOT_FOUND", message="Post not found", status_code=404)

        post.likes_count = post.likes_count + 1
        await self.repo.commit()

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(user.id),
                event_type=POST_LIKED,
                entity_type="community_post",
                entity_id=str(post.id),
                payload={"likes_count": post.likes_count},
            )
        )
        return post.likes_count

    # Polls
    async def create_poll(
        self, society_id: uuid.UUID, payload: PollCreate, author: User
    ) -> CommunityPoll:
        poll = CommunityPoll(
            society_id=society_id,
            created_by=author.id,
            question=payload.question.strip(),
            description=payload.description,
            options=payload.options,
            expires_at=payload.expires_at,
        )
        await self.repo.save(poll)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(author.id),
                event_type=POLL_CREATED,
                entity_type="community_poll",
                entity_id=str(poll.id),
                payload={"question": poll.question},
            )
        )
        return poll

    async def list_polls(self, society_id: uuid.UUID, current_user_id: uuid.UUID | None = None) -> list[PollOut]:
        polls = await self.repo.list_polls(society_id)

        poll_outs: list[PollOut] = []
        for p in polls:
            total_votes = len(p.votes)
            stats: list[PollOptionStats] = []

            for idx, opt_text in enumerate(p.options):
                opt_votes = sum(1 for v in p.votes if v.option_index == idx)
                pct = round((opt_votes / total_votes * 100), 1) if total_votes > 0 else 0.0
                stats.append(PollOptionStats(index=idx, text=opt_text, vote_count=opt_votes, percentage=pct))

            user_voted = None
            if current_user_id:
                user_vote_obj = next((v for v in p.votes if v.user_id == current_user_id), None)
                if user_vote_obj:
                    user_voted = user_vote_obj.option_index

            poll_outs.append(
                PollOut(
                    id=p.id,
                    society_id=p.society_id,
                    created_by=p.created_by,
                    author_name=p.author.full_name if p.author else "Resident",
                    question=p.question,
                    description=p.description,
                    options=p.options,
                    total_votes=total_votes,
                    stats=stats,
                    user_voted_option=user_voted,
                    is_active=p.is_active,
                    created_at=p.created_at,
                )
            )
        return poll_outs

    async def cast_vote(
        self, society_id: uuid.UUID, poll_id: uuid.UUID, payload: PollVoteRequest, user: User
    ) -> PollVote:
        existing = await self.repo.get_poll_vote(poll_id, user.id)
        if existing:
            raise AppException(code="ALREADY_VOTED", message="You have already voted on this poll", status_code=400)

        vote = PollVote(
            poll_id=poll_id,
            user_id=user.id,
            unit_id=payload.unit_id,
            option_index=payload.option_index,
        )
        await self.repo.save(vote)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(user.id),
                event_type=POLL_VOTED,
                entity_type="community_poll",
                entity_id=str(poll_id),
                payload={"option_index": vote.option_index},
            )
        )
        return vote

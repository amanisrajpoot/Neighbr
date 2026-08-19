import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.community.models import CommunityPost, PostComment, CommunityPoll, PollVote
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
        self.db.add(post)
        await self.db.commit()
        await self.db.refresh(post)
        return post

    async def list_posts(
        self, society_id: uuid.UUID, category: str | None = None
    ) -> list[CommunityPost]:
        query = (
            select(CommunityPost)
            .where(CommunityPost.society_id == society_id, CommunityPost.is_active.is_(True))
            .options(
                selectinload(CommunityPost.author),
                selectinload(CommunityPost.unit),
                selectinload(CommunityPost.comments).selectinload(PostComment.author),
            )
        )
        if category and category != "all":
            query = query.where(CommunityPost.category == category)

        query = query.order_by(CommunityPost.is_pinned.desc(), CommunityPost.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def add_comment(
        self, society_id: uuid.UUID, post_id: uuid.UUID, payload: PostCommentCreate, author: User
    ) -> PostComment:
        result = await self.db.execute(
            select(CommunityPost).where(CommunityPost.id == post_id, CommunityPost.society_id == society_id)
        )
        post = result.scalar_one_or_none()
        if not post:
            raise AppException(code="POST_NOT_FOUND", message="Post not found", status_code=404)

        comment = PostComment(
            post_id=post.id,
            author_id=author.id,
            content=payload.content.strip(),
        )
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        return comment

    async def like_post(self, society_id: uuid.UUID, post_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(CommunityPost).where(CommunityPost.id == post_id, CommunityPost.society_id == society_id)
        )
        post = result.scalar_one_or_none()
        if not post:
            raise AppException(code="POST_NOT_FOUND", message="Post not found", status_code=404)

        post.likes_count = post.likes_count + 1
        await self.db.commit()
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
        self.db.add(poll)
        await self.db.commit()
        await self.db.refresh(poll)
        return poll

    async def list_polls(self, society_id: uuid.UUID, current_user_id: uuid.UUID | None = None) -> list[PollOut]:
        result = await self.db.execute(
            select(CommunityPoll)
            .where(CommunityPoll.society_id == society_id, CommunityPoll.is_active.is_(True))
            .options(
                selectinload(CommunityPoll.author),
                selectinload(CommunityPoll.votes),
            )
            .order_by(CommunityPoll.created_at.desc())
        )
        polls = result.scalars().all()

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
        # Check if already voted
        existing = await self.db.execute(
            select(PollVote).where(PollVote.poll_id == poll_id, PollVote.user_id == user.id)
        )
        if existing.scalar_one_or_none():
            raise AppException(code="ALREADY_VOTED", message="You have already voted on this poll", status_code=400)

        vote = PollVote(
            poll_id=poll_id,
            user_id=user.id,
            unit_id=payload.unit_id,
            option_index=payload.option_index,
        )
        self.db.add(vote)
        await self.db.commit()
        await self.db.refresh(vote)
        return vote

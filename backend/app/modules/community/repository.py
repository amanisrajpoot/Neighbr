import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.community.models import CommunityPost, PostComment, CommunityPoll, PollVote

class CommunityRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_post(self, society_id: uuid.UUID, post_id: uuid.UUID) -> Optional[CommunityPost]:
        res = await self.db.execute(
            select(CommunityPost).where(
                CommunityPost.id == post_id, CommunityPost.society_id == society_id
            )
        )
        return res.scalar_one_or_none()

    async def list_posts(self, society_id: uuid.UUID, category: Optional[str] = None) -> List[CommunityPost]:
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
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def list_polls(self, society_id: uuid.UUID) -> List[CommunityPoll]:
        res = await self.db.execute(
            select(CommunityPoll)
            .where(CommunityPoll.society_id == society_id, CommunityPoll.is_active.is_(True))
            .options(
                selectinload(CommunityPoll.author),
                selectinload(CommunityPoll.votes),
            )
            .order_by(CommunityPoll.created_at.desc())
        )
        return list(res.scalars().all())

    async def get_poll_vote(self, poll_id: uuid.UUID, user_id: uuid.UUID) -> Optional[PollVote]:
        res = await self.db.execute(
            select(PollVote).where(PollVote.poll_id == poll_id, PollVote.user_id == user_id)
        )
        return res.scalar_one_or_none()

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)

    async def commit(self) -> None:
        await self.db.commit()

import uuid
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.auth.models import User
from app.modules.community.schemas import (
    PostCreate,
    PostOut,
    PostCommentCreate,
    PostCommentOut,
    PollCreate,
    PollVoteRequest,
    PollOut,
)
from app.modules.community.service import CommunityService

router = APIRouter(prefix="/societies/{society_id}/community", tags=["Community Forum & Polls"])

def _format_post(p) -> PostOut:
    return PostOut(
        id=p.id,
        society_id=p.society_id,
        author_id=p.author_id,
        author_name=p.author.full_name if p.author else "Resident",
        unit_id=p.unit_id,
        unit_number=p.unit.unit_number if p.unit else None,
        title=p.title,
        content=p.content,
        category=p.category,
        images=p.images or [],
        likes_count=p.likes_count,
        is_pinned=p.is_pinned,
        created_at=p.created_at,
        comments=[
            PostCommentOut(
                id=c.id,
                post_id=c.post_id,
                author_id=c.author_id,
                author_name=c.author.full_name if c.author else "Resident",
                content=c.content,
                created_at=c.created_at,
            )
            for c in p.comments
        ],
    )

@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    society_id: uuid.UUID,
    payload: PostCreate,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    post = await service.create_post(society_id, payload, user)
    posts = await service.list_posts(society_id)
    created = next((p for p in posts if p.id == post.id), post)
    return _format_post(created)

@router.get("/posts", response_model=list[PostOut])
async def list_posts(
    society_id: uuid.UUID,
    category: str | None = None,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    posts = await service.list_posts(society_id, category=category)
    return [_format_post(p) for p in posts]

@router.post("/posts/{post_id}/comments", response_model=PostCommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    society_id: uuid.UUID,
    post_id: uuid.UUID,
    payload: PostCommentCreate,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    c = await service.add_comment(society_id, post_id, payload, user)
    return PostCommentOut(
        id=c.id,
        post_id=c.post_id,
        author_id=c.author_id,
        author_name=user.full_name,
        content=c.content,
        created_at=c.created_at,
    )

@router.post("/posts/{post_id}/like")
async def like_post(
    society_id: uuid.UUID,
    post_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    likes = await service.like_post(society_id, post_id)
    return {"likes_count": likes}

# Polls
@router.post("/polls", response_model=PollOut, status_code=status.HTTP_201_CREATED)
async def create_poll(
    society_id: uuid.UUID,
    payload: PollCreate,
    user: User = Depends(get_current_user),
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    poll = await service.create_poll(society_id, payload, user)
    polls = await service.list_polls(society_id, current_user_id=user.id)
    return next(p for p in polls if p.id == poll.id)

@router.get("/polls", response_model=list[PollOut])
async def list_polls(
    society_id: uuid.UUID,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    return await service.list_polls(society_id, current_user_id=user.id)

@router.post("/polls/{poll_id}/vote", response_model=list[PollOut])
async def vote_poll(
    society_id: uuid.UUID,
    poll_id: uuid.UUID,
    payload: PollVoteRequest,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    await service.cast_vote(society_id, poll_id, payload, user)
    return await service.list_polls(society_id, current_user_id=user.id)

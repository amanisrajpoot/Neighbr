import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.community.permissions import RequireResident
from app.modules.community.schemas import (
    PostCreate,
    PostCommentCreate,
    PostOut,
    PostCommentOut,
    PollCreate,
    PollVoteRequest,
    PollOut,
    PollVoteOut,
)
from app.modules.community.service import CommunityService

router = APIRouter(prefix="/societies/{society_id}/community", tags=["Social & Community"])

def _format_post(post) -> PostOut:
    return PostOut(
        id=post.id,
        society_id=post.society_id,
        author_id=post.author_id,
        author_name=post.author.full_name if post.author else "Resident",
        unit_id=post.unit_id,
        unit_number=post.unit.unit_number if post.unit else None,
        title=post.title,
        content=post.content,
        category=post.category,
        images=post.images or [],
        likes_count=post.likes_count,
        is_pinned=post.is_pinned,
        is_active=post.is_active,
        created_at=post.created_at,
        comments=[
            PostCommentOut(
                id=c.id,
                post_id=c.post_id,
                author_id=c.author_id,
                author_name=c.author.full_name if c.author else "Resident",
                content=c.content,
                created_at=c.created_at,
            )
            for c in post.comments
        ],
    )

@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    society_id: uuid.UUID,
    payload: PostCreate,
    author: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    post = await service.create_post(society_id, payload, author)
    # Get fully loaded post
    posts = await service.list_posts(society_id)
    new_post = next(p for p in posts if p.id == post.id)
    return _format_post(new_post)

@router.get("/posts", response_model=list[PostOut])
async def list_posts(
    society_id: uuid.UUID,
    category: str | None = None,
    _auth = RequireResident,
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
    author: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    c = await service.add_comment(society_id, post_id, payload, author)
    return PostCommentOut(
        id=c.id,
        post_id=c.post_id,
        author_id=c.author_id,
        author_name=author.full_name,
        content=c.content,
        created_at=c.created_at,
    )

@router.post("/posts/{post_id}/like", response_model=dict)
async def like_post(
    society_id: uuid.UUID,
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    likes = await service.like_post(society_id, post_id, user)
    return {"likes_count": likes}

@router.post("/polls", response_model=PollOut, status_code=status.HTTP_201_CREATED)
async def create_poll(
    society_id: uuid.UUID,
    payload: PollCreate,
    author: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    poll = await service.create_poll(society_id, payload, author)
    # reload full poll list to format stats
    polls = await service.list_polls(society_id, current_user_id=author.id)
    new_poll = next(p for p in polls if p.id == poll.id)
    return new_poll

@router.get("/polls", response_model=list[PollOut])
async def list_polls(
    society_id: uuid.UUID,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    return await service.list_polls(society_id, current_user_id=user.id)

@router.post("/polls/{poll_id}/vote", response_model=PollVoteOut, status_code=status.HTTP_201_CREATED)
async def cast_vote(
    society_id: uuid.UUID,
    poll_id: uuid.UUID,
    payload: PollVoteRequest,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    vote = await service.cast_vote(society_id, poll_id, payload, user)
    return PollVoteOut(
        id=vote.id,
        poll_id=vote.poll_id,
        user_id=vote.user_id,
        unit_id=vote.unit_id,
        option_index=vote.option_index,
        voted_at=vote.voted_at,
    )

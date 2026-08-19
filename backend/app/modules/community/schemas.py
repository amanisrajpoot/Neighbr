import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Any

class PostCommentCreate(BaseModel):
    content: str

class PostCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    post_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str | None = None
    content: str
    created_at: datetime

class PostCreate(BaseModel):
    title: str
    content: str
    category: str = "general"
    images: list[str] = []
    unit_id: uuid.UUID | None = None

class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str | None = None
    unit_id: uuid.UUID | None = None
    unit_number: str | None = None
    title: str
    content: str
    category: str
    images: list[str] = []
    likes_count: int
    is_pinned: bool
    created_at: datetime
    comments: list[PostCommentOut] = []

class PollCreate(BaseModel):
    question: str
    description: str | None = None
    options: list[str]
    expires_at: datetime | None = None

class PollVoteRequest(BaseModel):
    option_index: int
    unit_id: uuid.UUID | None = None

class PollOptionStats(BaseModel):
    index: int
    text: str
    vote_count: int
    percentage: float

class PollOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    created_by: uuid.UUID
    author_name: str | None = None
    question: str
    description: str | None = None
    options: list[str] = []
    total_votes: int
    stats: list[PollOptionStats] = []
    user_voted_option: int | None = None
    is_active: bool
    created_at: datetime

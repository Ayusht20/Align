from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Communities ─────────────────────────────────────────────────────────────

class CommunityCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None

class CommunityOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    creator_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Posts ───────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    title: str
    content: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    post_type: str = "text"   # "text" | "image" | "link"
    community_id: int

class PostOut(BaseModel):
    id: int
    title: str
    content: Optional[str]
    image_url: Optional[str]
    link_url: Optional[str]
    post_type: str
    community_id: int
    author_id: int
    created_at: datetime
    vote_count: int = 0         # computed field, not stored in DB
    comment_count: int = 0      # computed field, not stored in DB
    author_username: str = ""   # flattened for convenience

    class Config:
        from_attributes = True


# ─── Comments ────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str
    post_id: int

class CommentOut(BaseModel):
    id: int
    content: str
    post_id: int
    author_id: int
    author_username: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Votes ───────────────────────────────────────────────────────────────────

class VoteCreate(BaseModel):
    post_id: int
    vote_type: str   # "up" or "down"
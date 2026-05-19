from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
from models import User, Post, Vote
from auth import get_current_user
from supabase import create_client
import os, uuid

router = APIRouter(prefix="/api/users", tags=["Users"])

SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET      = os.getenv("SUPABASE_BUCKET", "post-images")
ALLOWED_TYPES        = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_SIZE_BYTES       = 2 * 1024 * 1024

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class ProfileUpdate(BaseModel):
    bio: Optional[str] = None


def serialize_post(post: Post) -> dict:
    vote_count = sum(1 if v.type == "up" else -1 for v in post.votes)
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "image_url": post.image_url,
        "link_url": post.link_url,
        "post_type": post.post_type,
        "community_id": post.community_id,
        "author_id": post.author_id,
        "author_username": post.author.username,
        "created_at": post.created_at,
        "vote_count": vote_count,
        "comment_count": len(post.comments),
    }


# ─── /me routes MUST come before /{username} ─────────────────────────────────
# FastAPI matches routes in order — if /{username} is first,
# "me" gets treated as a username and never reaches these endpoints.

@router.get("/me/profile")
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
        "created_at": current_user.created_at,
    }


@router.patch("/me/bio")
def update_bio(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.bio and len(payload.bio) > 300:
        raise HTTPException(status_code=400, detail="Bio must be under 300 characters.")
    current_user.bio = payload.bio
    db.commit()
    db.refresh(current_user)
    return {"message": "Bio updated", "bio": current_user.bio}


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPG, PNG, WEBP, or GIF.")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    ext      = ALLOWED_TYPES[file.content_type]
    filename = f"avatars/{current_user.id}_{uuid.uuid4().hex}{ext}"

    try:
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=filename,
            file=contents,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(filename)
    current_user.avatar_url = public_url
    db.commit()

    return {"message": "Avatar updated", "avatar_url": public_url}


# ─── /{username} MUST come after /me routes ──────────────────────────────────

@router.get("/{username}")
def get_profile(username: str, db: Session = Depends(get_db)):
    """Public profile — anyone can view."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    posts      = db.query(Post).filter(Post.author_id == user.id).all()
    serialized = sorted([serialize_post(p) for p in posts], key=lambda x: x["created_at"], reverse=True)
    total_karma = sum(p["vote_count"] for p in serialized)

    return {
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at,
        "post_count": len(serialized),
        "karma": total_karma,
        "posts": serialized,
    }
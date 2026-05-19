from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Post, Community, User, Vote
from schemas import PostCreate, PostOut
from auth import get_current_user

router = APIRouter(prefix="/api/posts", tags=["Posts"])


# ─── Helper: build PostOut with computed fields ───────────────────────────────

def serialize_post(post: Post) -> dict:
    """
    SQLAlchemy models don't store vote_count or comment_count.
    We compute them here before returning.
    """
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


# ─── Create post ─────────────────────────────────────────────────────────────

@router.post("/", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new post inside a community. Requires login.
    post_type can be: "text", "image", or "link"
    """
    community = db.query(Community).filter(Community.id == payload.community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    post = Post(
        title=payload.title,
        content=payload.content,
        image_url=payload.image_url,
        link_url=payload.link_url,
        post_type=payload.post_type,
        community_id=payload.community_id,
        author_id=current_user.id,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return serialize_post(post)


# ─── Get single post ─────────────────────────────────────────────────────────

@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    """
    Fetch a single post by ID. Includes vote count and comment count.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return serialize_post(post)


# ─── List posts in a community ───────────────────────────────────────────────

@router.get("/community/{slug}", response_model=List[PostOut])
def get_community_posts(
    slug: str,
    sort: str = Query("new", enum=["new", "top"]),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    Get all posts for a community.
    sort=new  → ordered by creation date (newest first)
    sort=top  → ordered by vote count (highest first)
    """
    community = db.query(Community).filter(Community.slug == slug).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    posts = db.query(Post).filter(Post.community_id == community.id).all()
    serialized = [serialize_post(p) for p in posts]

    if sort == "top":
        serialized.sort(key=lambda p: p["vote_count"], reverse=True)
    else:
        serialized.sort(key=lambda p: p["created_at"], reverse=True)

    return serialized[skip: skip + limit]


# ─── List all posts (home feed) ───────────────────────────────────────────────

@router.get("/", response_model=List[PostOut])
def get_all_posts(
    sort: str = Query("new", enum=["new", "top"]),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    Home feed — all posts across all communities.
    sort=new → newest first | sort=top → most votes first
    """
    posts = db.query(Post).all()
    serialized = [serialize_post(p) for p in posts]

    if sort == "top":
        serialized.sort(key=lambda p: p["vote_count"], reverse=True)
    else:
        serialized.sort(key=lambda p: p["created_at"], reverse=True)

    return serialized[skip: skip + limit]

@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a post. Only the author can delete their own post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}
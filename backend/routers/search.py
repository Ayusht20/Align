from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import Post, Community, User, Vote

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("/")
def search(
    q: str = Query(..., min_length=1),
    type: str = Query("all"),  # all | posts | communities | users
    db: Session = Depends(get_db),
):
    q = q.strip()
    pattern = f"%{q}%"
    results = {}

    if type in ("all", "posts"):
        posts = (
            db.query(Post)
            .filter(
                or_(
                    Post.title.ilike(pattern),
                    Post.content.ilike(pattern),
                )
            )
            .limit(10)
            .all()
        )
        results["posts"] = [
            {
                "id": p.id,
                "title": p.title,
                "content": p.content,
                "post_type": p.post_type,
                "author_username": p.author.username,
                "community_id": p.community_id,
                "created_at": p.created_at,
                "vote_count": sum(1 if v.type == "up" else -1 for v in p.votes),
                "comment_count": len(p.comments),
                "image_url": p.image_url,
            }
            for p in posts
        ]

    if type in ("all", "communities"):
        communities = (
            db.query(Community)
            .filter(
                or_(
                    Community.name.ilike(pattern),
                    Community.description.ilike(pattern),
                    Community.slug.ilike(pattern),
                )
            )
            .limit(8)
            .all()
        )
        results["communities"] = [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "description": c.description,
                "created_at": c.created_at,
            }
            for c in communities
        ]

    if type in ("all", "users"):
        users = (
            db.query(User)
            .filter(User.username.ilike(pattern))
            .limit(8)
            .all()
        )
        results["users"] = [
            {
                "id": u.id,
                "username": u.username,
                "bio": u.bio,
                "avatar_url": u.avatar_url,
            }
            for u in users
        ]

    return results
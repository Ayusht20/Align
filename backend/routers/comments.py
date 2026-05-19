from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Comment, Post, User, Notification
from schemas import CommentCreate, CommentOut
from auth import get_current_user

router = APIRouter(prefix="/api/comments", tags=["Comments"])


@router.post("/", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == payload.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(
        content=payload.content,
        post_id=payload.post_id,
        author_id=current_user.id,
    )
    db.add(comment)

    # Notify post author when someone comments (not self-comments)
    if post.author_id != current_user.id:
        notif = Notification(
            user_id=post.author_id,
            actor_id=current_user.id,
            type="comment",
            message=f"u/{current_user.username} commented on your post \"{post.title[:50]}\"",
            link=f"/post/{post.id}",
        )
        db.add(notif)

    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "content": comment.content,
        "post_id": comment.post_id,
        "author_id": comment.author_id,
        "author_username": current_user.username,
        "created_at": comment.created_at,
    }


@router.get("/post/{post_id}", response_model=List[CommentOut])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return [
        {
            "id": c.id,
            "content": c.content,
            "post_id": c.post_id,
            "author_id": c.author_id,
            "author_username": c.author.username,
            "created_at": c.created_at,
        }
        for c in comments
    ]


@router.delete("/{comment_id}", status_code=status.HTTP_200_OK)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
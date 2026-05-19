from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Vote, Post, User, Notification
from schemas import VoteCreate
from auth import get_current_user

router = APIRouter(prefix="/api/votes", tags=["Votes"])


@router.post("/", status_code=status.HTTP_200_OK)
def cast_vote(
    payload: VoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.vote_type not in ("up", "down"):
        raise HTTPException(status_code=400, detail="vote_type must be 'up' or 'down'")

    post = db.query(Post).filter(Post.id == payload.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing_vote = db.query(Vote).filter_by(
        user_id=current_user.id,
        post_id=payload.post_id
    ).first()

    if existing_vote is None:
        new_vote = Vote(
            type=payload.vote_type,
            user_id=current_user.id,
            post_id=payload.post_id,
        )
        db.add(new_vote)

        # Notify post author on upvote (not self-votes, not downvotes)
        if payload.vote_type == "up" and post.author_id != current_user.id:
            notif = Notification(
                user_id=post.author_id,
                actor_id=current_user.id,
                type="vote",
                message=f"u/{current_user.username} upvoted your post \"{post.title[:50]}\"",
                link=f"/post/{post.id}",
            )
            db.add(notif)

        db.commit()
        return {"message": f"Vote '{payload.vote_type}' recorded"}

    if existing_vote.type == payload.vote_type:
        db.delete(existing_vote)
        db.commit()
        return {"message": "Vote removed"}

    existing_vote.type = payload.vote_type
    db.commit()
    return {"message": f"Vote changed to '{payload.vote_type}'"}
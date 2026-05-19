from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Notification, User
from auth import get_current_user
from datetime import datetime, timedelta
router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


def create_notification(db, user_id, actor_id, type, message, link=None):
    """
    Helper to create a notification with a cap of 100 per user.
    Deletes the oldest one if limit is reached — no unbounded growth.
    """
    # Don't notify yourself
    if user_id == actor_id:
        return

    count = db.query(Notification).filter(Notification.user_id == user_id).count()
    if count >= 100:
        # Delete oldest notification to make room
        oldest = (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.asc())
            .first()
        )
        if oldest:
            db.delete(oldest)

    notif = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        message=message,
        link=link,
    )
    db.add(notif)


@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import timedelta
    # Auto-cleanup: delete notifications older than 30 days on every fetch
    # No cron needed — cleans itself naturally
    cutoff = datetime.utcnow() - timedelta(days=30)
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.created_at < cutoff,
    ).delete()
    db.commit()

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": n.id,
            "type": n.type,
            "message": n.message,
            "link": n.link,
            "is_read": n.is_read,
            "created_at": n.created_at,
            "actor_username": n.actor.username,
            "actor_avatar": n.actor.avatar_url,
        }
        for n in notifications
    ]


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == "false",
    ).count()
    return {"unread": count}


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == "false",
    ).update({"is_read": "true"})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.patch("/{notification_id}/read")
def mark_one_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if n:
        n.is_read = "true"
        db.commit()
    return {"message": "Marked as read"}
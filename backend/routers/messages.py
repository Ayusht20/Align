from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel
from typing import List
from database import get_db
from models import Message, User
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/messages", tags=["Messages"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    receiver_username: str
    content: str


# ─── Send a message ──────────────────────────────────────────────────────────

@router.post("/", status_code=201)
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.content.strip():
        raise HTTPException(400, "Message cannot be empty.")

    if len(payload.content) > 1000:
        raise HTTPException(400, "Message too long. Max 1000 characters.")

    if payload.receiver_username == current_user.username:
        raise HTTPException(400, "You cannot message yourself.")

    receiver = db.query(User).filter(User.username == payload.receiver_username).first()
    if not receiver:
        raise HTTPException(404, "User not found.")

    msg = Message(
        content=payload.content.strip(),
        sender_id=current_user.id,
        receiver_id=receiver.id,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "content": msg.content,
        "sender_username": current_user.username,
        "receiver_username": receiver.username,
        "created_at": msg.created_at,
        "is_read": msg.is_read,
        "is_mine": True,
    }


# ─── Get conversation with a user ────────────────────────────────────────────

@router.get("/conversation/{username}")
def get_conversation(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    other = db.query(User).filter(User.username == username).first()
    if not other:
        raise HTTPException(404, "User not found.")

    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == other.id),
                and_(Message.sender_id == other.id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at.desc())
        .limit(100)
        .all()
    )
    messages = list(reversed(messages))  # Show oldest first in UI

    # Mark received messages as read
    for m in messages:
        if m.receiver_id == current_user.id and m.is_read == "false":
            m.is_read = "true"
    db.commit()

    return [
        {
            "id": m.id,
            "content": m.content,
            "sender_username": m.sender.username,
            "receiver_username": m.receiver.username,
            "created_at": m.created_at,
            "is_read": m.is_read,
            "is_mine": m.sender_id == current_user.id,
        }
        for m in messages
    ]


# ─── Get inbox (list of conversations) ───────────────────────────────────────

@router.get("/inbox")
def get_inbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns one entry per unique conversation partner,
    showing the latest message and unread count.
    """
    all_messages = (
        db.query(Message)
        .filter(
            or_(
                Message.sender_id == current_user.id,
                Message.receiver_id == current_user.id,
            )
        )
        .order_by(Message.created_at.desc())
        .all()
    )

    seen = set()
    conversations = []

    for m in all_messages:
        other_id = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        if other_id in seen:
            continue
        seen.add(other_id)

        other = db.query(User).filter(User.id == other_id).first()
        unread = db.query(Message).filter(
            Message.sender_id == other_id,
            Message.receiver_id == current_user.id,
            Message.is_read == "false",
        ).count()

        conversations.append({
            "username": other.username,
            "avatar_url": other.avatar_url,
            "last_message": m.content,
            "last_message_time": m.created_at,
            "unread_count": unread,
            "is_mine": m.sender_id == current_user.id,
        })

    return conversations


# ─── Unread count (for navbar badge) ─────────────────────────────────────────

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.is_read == "false",
    ).count()
    return {"unread": count}
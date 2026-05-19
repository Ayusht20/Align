from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, unique=True, nullable=False, index=True)
    username   = Column(String, unique=True, nullable=False, index=True)
    password   = Column(String, nullable=False)
    bio        = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    posts      = relationship("Post", back_populates="author", cascade="all, delete")
    comments   = relationship("Comment", back_populates="author", cascade="all, delete")
    votes      = relationship("Vote", back_populates="user", cascade="all, delete")
    communities = relationship("Community", back_populates="creator")


class Community(Base):
    __tablename__ = "communities"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, unique=True, nullable=False)
    slug        = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    creator_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="communities")
    posts   = relationship("Post", back_populates="community", cascade="all, delete")


class Post(Base):
    __tablename__ = "posts"

    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String, nullable=False)
    content      = Column(String, nullable=True)       # for text posts
    image_url    = Column(String, nullable=True)       # for image posts
    link_url     = Column(String, nullable=True)       # for link posts
    post_type    = Column(String, default="text")      # "text" | "image" | "link"
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=False)
    author_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    community = relationship("Community", back_populates="posts")
    author    = relationship("User", back_populates="posts")
    comments  = relationship("Comment", back_populates="post", cascade="all, delete")
    votes     = relationship("Vote", back_populates="post", cascade="all, delete")


class Comment(Base):
    __tablename__ = "comments"

    id         = Column(Integer, primary_key=True, index=True)
    content    = Column(String, nullable=False)
    post_id    = Column(Integer, ForeignKey("posts.id"), nullable=False)
    author_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    post   = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Vote(Base):
    __tablename__ = "votes"

    id      = Column(Integer, primary_key=True, index=True)
    type    = Column(String, nullable=False)  # "up" or "down"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)

    # A user can only vote once per post
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="unique_user_post_vote"),)

    # Relationships
    user = relationship("User", back_populates="votes")
    post = relationship("Post", back_populates="votes")

class Message(Base):
    __tablename__ = "messages"

    id          = Column(Integer, primary_key=True, index=True)
    content     = Column(String, nullable=False)
    sender_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    is_read     = Column(String, default="false")

    sender   = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    actor_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    type       = Column(String, nullable=False)
    message    = Column(String, nullable=False)
    link       = Column(String, nullable=True)
    is_read    = Column(String, default="false")
    created_at = Column(DateTime, default=datetime.utcnow)

    user  = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])
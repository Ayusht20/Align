from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Community, User
from schemas import CommunityCreate, CommunityOut
from auth import get_current_user

router = APIRouter(prefix="/api/communities", tags=["Communities"])


@router.post("/", response_model=CommunityOut, status_code=status.HTTP_201_CREATED)
def create_community(
    payload: CommunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # must be logged in
):
    """
    Create a new community. Slug must be unique (used in the URL).
    Example: name="Tech Talk", slug="tech-talk"
    """
    if db.query(Community).filter(Community.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="A community with this slug already exists")

    if db.query(Community).filter(Community.name == payload.name).first():
        raise HTTPException(status_code=400, detail="A community with this name already exists")

    community = Community(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        creator_id=current_user.id,
    )
    db.add(community)
    db.commit()
    db.refresh(community)
    return community


@router.get("/", response_model=List[CommunityOut])
def list_communities(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    List all communities. Supports pagination via skip/limit.
    Public endpoint — no login required.
    """
    return db.query(Community).offset(skip).limit(limit).all()


@router.get("/{slug}", response_model=CommunityOut)
def get_community(slug: str, db: Session = Depends(get_db)):
    """
    Get a single community by its slug.
    Used to render the community page header.
    """
    community = db.query(Community).filter(Community.slug == slug).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    return community
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserOut, LoginRequest, TokenOut
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    - Checks for duplicate email and username before creating.
    - Password is bcrypt-hashed before storing.
    """
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=payload.username,
        email=payload.email,
        password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email + password.
    Returns a JWT access token valid for 24 hours.
    Frontend should store this in an httpOnly cookie or localStorage.
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    token = create_access_token(user.id, user.username)
    return {"access_token": token, "token_type": "bearer"}
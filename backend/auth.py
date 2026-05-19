from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User
import os

# ─── Config ──────────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")
TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# FastAPI looks for a Bearer token in the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ─── Password helpers ────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ─── Token helpers ───────────────────────────────────────────────────────────

def create_access_token(user_id: int, username: str = "") -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ─── Auth dependency ─────────────────────────────────────────────────────────
# Use this in any route that requires a logged-in user:
#   current_user: User = Depends(get_current_user)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_error

    return user
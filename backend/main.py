
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import engine, Base, get_db  # Added get_db here



import models  # noqa: F401

# Import routers
from routers import auth, communities, posts, votes, comments, upload, users, messages, notifications, search

# Create all tables in Supabase on startup (safe to run multiple times)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Align API",
    description="Backend for Align — a community discussion platform",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      
        "https://align-one-tau.vercel.app",   
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(communities.router)
app.include_router(posts.router)
app.include_router(votes.router)
app.include_router(comments.router)
app.include_router(upload.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(search.router)



@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": "Align API"}



@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        # Runs a tiny 1-second check to tell Supabase we are still active
        db.execute(text("SELECT 1"))
        
        return {
            "status": "UP",
            "database": "CONNECTED",
            "message": "Keep awake channel active"
        }
    except Exception as e:
        return {
            "status": "DOWN",
            "database": "ERROR",
            "error": str(e)
        }


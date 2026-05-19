from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base

# Import all models so SQLAlchemy registers them before create_all
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



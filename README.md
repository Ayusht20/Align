<div align="center">
  <img src="frontend/public/align.png" alt="Align Logo" width="100"/>

  # Align

  **A modern full-stack community discussion platform**

  [![Live Demo](https://img.shields.io/badge/Live-Demo-orange?style=flat-square)](https://align-one-tau.vercel.app)
  [![API Docs](https://img.shields.io/badge/API-Docs-blue?style=flat-square)](https://align-backend.onrender.com/docs)
  [![GitHub](https://img.shields.io/badge/GitHub-Repo-black?style=flat-square&logo=github)](https://github.com/Ayusht20/Align)

  > Built as an internship project to demonstrate real-world full-stack engineering.

</div>

---

![Home Feed](screenshots/home.png)

---

## What is Align?

Align is a Reddit-style community platform where users create communities, share posts, vote, comment, and message each other in real time. Built with a Python backend, Next.js frontend, and PostgreSQL database — all deployed on separate cloud services.

---

## Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | Signup, login, JWT tokens, bcrypt password hashing |
| 🏘 Communities | Create and browse topic-based communities |
| 📝 Posts | Text, image, and link posts with file upload |
| ⬆️ Voting | Upvote / downvote with karma tracking |
| 💬 Comments | Add and delete comments with notifications |
| ✉️ Messaging | Real-time DMs via Supabase Realtime — zero polling |
| 🔔 Notifications | Live bell notifications for votes and comments |
| 🔍 Search | Search posts, communities, and users |
| 👤 Profiles | Bio, avatar upload, karma, post history |
| 🌙 Dark mode | Persisted dark / light mode toggle |
| 📱 Responsive | Mobile, tablet, and desktop |

---

## Screenshots

### Home Feed
![Home Feed](screenshots/home.png)

### Login !
![Login!](screenshots/login.png)

### Dark Mode
![Dark Mode](screenshots/dark-mode.png)

### Post Detail & Comments
![Post Detail](screenshots/post.png)

### Real-Time Direct Messaging
![Chat](screenshots/chat.png)

### User Profile
![Profile](screenshots/profile.png)

### Notifications
![Notifications](screenshots/notifications.png)

### Search
![Search](screenshots/search.png)

### Mobile View
![Mobile](screenshots/mobile.png)

---

## Tech Stack

### Backend
| Tool | Purpose |
|------|---------|
| FastAPI | REST API with auto-generated docs |
| SQLAlchemy | Python ORM — no raw SQL needed |
| PostgreSQL | Relational database hosted on Supabase |
| PyJWT + bcrypt | JWT authentication and password hashing |
| Supabase SDK | File storage and real-time subscriptions |
| Pillow | Auto-crop uploaded avatars to square |

### Frontend
| Tool | Purpose |
|------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type-safe JavaScript |
| Tailwind CSS | Utility-first styling |
| Axios | HTTP client with JWT interceptor |
| Supabase JS | WebSocket real-time subscriptions |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Supabase | Database + file storage + realtime |
| Render | Backend API hosting |
| Vercel | Frontend hosting and CDN |

---

## Architecture

```
Browser (Next.js)
      │
      │  HTTP + JWT token
      ▼
FastAPI Backend
      │
      ├── SQLAlchemy ──► Supabase PostgreSQL
      └── Supabase SDK ──► Storage + Realtime WebSocket
                                    │
                                    │ Push on DB insert
                                    ▼
                              Browser (instant update)
```

**Real-time without polling** — instead of the browser asking "any new messages?" every few seconds, Supabase Realtime pushes new rows to connected clients the moment they are inserted. Zero unnecessary database queries.

---

## Database Schema

```
users          id, username, email, password, bio, avatar_url, created_at
communities    id, name, slug, description, creator_id, created_at
posts          id, title, content, image_url, link_url, post_type, community_id, author_id
comments       id, content, post_id, author_id, created_at
votes          id, type (up/down), user_id, post_id  ← unique constraint per user+post
messages       id, content, sender_id, receiver_id, is_read, created_at
notifications  id, type, message, link, user_id, actor_id, is_read, created_at
```

### Relationships

```
users ──< posts ──< comments
      ──< votes
      ──< messages (as sender)
      ──< messages (as receiver)
      ──< notifications (as recipient)
      ──< communities (as creator)

communities ──< posts
```

---

## Folder Structure

```
Align/
├── README.md
├── .gitignore
│
├── backend/
│   ├── main.py              ← app entry point, CORS, router registration
│   ├── database.py          ← Supabase PostgreSQL connection
│   ├── models.py            ← 7 SQLAlchemy table definitions
│   ├── schemas.py           ← Pydantic request/response validation
│   ├── auth.py              ← JWT creation, bcrypt, get_current_user()
│   ├── requirements.txt
│   ├── render.yaml
│   └── routers/
│       ├── auth.py          ← POST /signup  /login
│       ├── posts.py         ← CRUD + sort + delete
│       ├── communities.py   ← create + list + detail
│       ├── comments.py      ← add + list + delete + notify
│       ├── votes.py         ← upvote/downvote + notify
│       ├── messages.py      ← inbox + conversation + send
│       ├── notifications.py ← get + mark read + auto cleanup
│       ├── users.py         ← profile + bio + avatar upload
│       ├── search.py        ← search across posts, users, communities
│       └── upload.py        ← image upload to Supabase Storage
│
└── frontend/
    ├── app/
    │   ├── layout.tsx                    ← root layout + providers + favicon
    │   ├── globals.css                   ← CSS variables, animations, dark mode
    │   ├── page.tsx                      ← home feed
    │   ├── login/page.tsx
    │   ├── signup/page.tsx
    │   ├── submit/page.tsx               ← create post
    │   ├── search/page.tsx
    │   ├── notifications/page.tsx
    │   ├── post/[id]/page.tsx            ← post detail + comments
    │   ├── r/[slug]/page.tsx             ← community page
    │   ├── user/[username]/page.tsx      ← public profile
    │   ├── messages/page.tsx             ← inbox
    │   ├── messages/[username]/page.tsx  ← real-time chat
    │   └── communities/create/page.tsx
    ├── components/
    │   ├── Navbar.tsx        ← search bar, badges, avatar dropdown
    │   ├── PostCard.tsx      ← vote buttons, image preview, comment count
    │   └── Avatar.tsx        ← gradient initial or uploaded photo
    ├── context/
    │   ├── AuthContext.tsx   ← global auth state (reactive navbar)
    │   └── ThemeContext.tsx  ← dark/light with localStorage
    └── lib/
        ├── api.ts            ← axios instance with JWT interceptor
        ├── auth.ts           ← login/logout/token helpers
        └── supabase.ts       ← shared Supabase JS client
```

---

## Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Supabase](https://supabase.com) project

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac / Linux
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
SECRET_KEY=your-random-secret-key
ALGORITHM=HS256
SUPABASE_URL=https://[REF].supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET=post-images
MAX_UPLOAD_SIZE_MB=5
```

```bash
uvicorn main:app --reload
# API → http://localhost:8000
# Docs → http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

```bash
npm run dev
# App → http://localhost:3000
```

### Supabase — run once in SQL Editor

```sql
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver
  ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id);
```

---

## API Reference

Full interactive docs at [`/docs`](https://align-backend.onrender.com/docs).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login → JWT token |
| GET | `/api/posts/` | ❌ | Feed (sort=new/top) |
| POST | `/api/posts/` | ✅ | Create post |
| DELETE | `/api/posts/{id}` | ✅ | Delete own post |
| POST | `/api/votes/` | ✅ | Upvote / downvote |
| POST | `/api/comments/` | ✅ | Add comment |
| DELETE | `/api/comments/{id}` | ✅ | Delete own comment |
| GET | `/api/messages/inbox` | ✅ | All conversations |
| POST | `/api/messages/` | ✅ | Send message |
| GET | `/api/notifications/` | ✅ | Get notifications |
| GET | `/api/search/?q=` | ❌ | Search everything |
| GET | `/api/users/{username}` | ❌ | Public profile |
| PATCH | `/api/users/me/bio` | ✅ | Update bio |
| POST | `/api/users/me/avatar` | ✅ | Upload avatar |

---

## Deployment

### Backend → Render

1. Connect `Ayusht20/Align` repo on [render.com](https://render.com)
2. Set **Root Directory** → `backend`
3. Build command → `pip install -r requirements.txt`
4. Start command → `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all `.env` variables in the Environment tab

### Frontend → Vercel

1. Import `Ayusht20/Align` repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** → `frontend`
3. Framework → Next.js (auto-detected)
4. Add all `.env.local` variables

---

## Design Decisions

**Supabase Realtime over polling**
Polling every 4 seconds with 100 users means 1,500 database queries per minute doing nothing useful. Realtime uses a persistent WebSocket — the database pushes changes to subscribers the moment a row is inserted. Zero wasted queries.

**JWT over server sessions**
JWTs are stateless. No session table is needed. Any server instance can verify any token using just the secret key, which makes horizontal scaling trivial.

**FastAPI over Flask**
FastAPI auto-generates `/docs`, validates every request body via Pydantic schemas before the handler runs, and is async-native — significantly faster for I/O-heavy workloads.

**Notification cap + lazy cleanup**
Notifications are capped at 100 per user. When the user opens their notifications page, rows older than 30 days are deleted automatically. No cron job needed — cleanup piggybacks on natural usage.

---

## What I Would Build Next

- Nested comment threads
- Community membership with a personalized home feed
- Google / GitHub OAuth login
- Post editing
- Mobile app using the same FastAPI backend

---

## Security

| Concern | Implementation |
|---------|---------------|
| Passwords | bcrypt hashed — never stored in plain text |
| Tokens | JWT with 24h expiry — stateless verification |
| Authorization | Every protected route runs `get_current_user()` |
| File uploads | Type + size validation before storage |
| SQL injection | SQLAlchemy ORM — parameterized queries only |
| CORS | Explicit origin allowlist |

---

<div align="center">

Built by **Ayush** · Internship Project · May 2026

[Live Demo](https://align-one-tau.vercel.app) · [API Docs](https://align-backend.onrender.com/docs) · [GitHub](https://github.com/Ayusht20/Align)

</div>
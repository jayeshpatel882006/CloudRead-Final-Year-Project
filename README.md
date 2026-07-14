# ☁️ CloudRead — Secure Cloud Digital Library

![MERN](https://img.shields.io/badge/Stack-MERN-2ecc71)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB)
![Node.js](https://img.shields.io/badge/Backend-Express_5-339933)
![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-47A248)
![JWT](https://img.shields.io/badge/Auth-JWT_+_bcrypt-orange)
![PDF](https://img.shields.io/badge/PDF-pdfjs--dist_+_Canvas-e74c3c)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)
![Status](https://img.shields.io/badge/Status-Active-success)

**CloudRead** is a secure, cloud-based digital library platform built on the MERN stack.
It enables controlled, role-based access to digital books with server-side PDF rendering,
automated expiry, and workflow-driven approvals — designed for academic institutions
and scalable cloud deployments.

---

# 📘 Project Overview

CloudRead solves a common institutional problem:
**How do you securely distribute digital books while preventing permanent access and misuse?**

The system introduces:

- 🔐 Secure PDF upload with random filename storage (no direct file exposure)
- 🖥️ Server-side page-by-page PDF rendering (the raw PDF never reaches the browser)
- 💧 Per-page watermark overlay with student identity (name, email, date)
- 🔄 Controlled access approval workflow (Student → Librarian → Grant)
- ⏳ Time-restricted reading permissions with automatic expiry
- 📊 Backend-driven analytics for institutional insights
- 📖 Full-screen premium e-book reader with lazy loading
- ⚙️ Cron-based automation for access expiry enforcement

This makes it suitable for:

- 🏫 Universities and colleges
- 📚 Digital libraries
- 🔬 Research labs
- 🎓 Training portals

---

# 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React 19 Frontend                           │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │  Auth UI  │  │  Dashboards  │  │  Premium E-Book Reader      │  │
│  │  (JWT)    │  │  (Role-based)│  │  (Canvas, Lazy Load, Zoom)  │  │
│  └──────────┘  └──────────────┘  └──────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  REST API (Axios + JWT Bearer Token)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Express 5 API Layer                          │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │  Auth    │  │  Book/Routes │  │  Access Routes              │  │
│  │  Routes  │  │  (CRUD + PDF)│  │  (Request/Approve/Reject)   │  │
│  └──────────┘  └──────────────┘  └──────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  PDF Renderer    │  │  PDF Metadata    │  │  Watermark       │  │
│  │  (pdfjs-dist +   │  │  Extractor       │  │  Config          │  │
│  │   @napi-rs/canvas)│  │  (pdfjs-dist)    │  │  (Centralized)  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │  Multer  │  │  Cron Jobs   │  │  Email Service (Nodemailer)  │  │
│  │  Upload  │  │  (Expiry)    │  │  (Gmail App Password)        │  │
│  └──────────┘  └──────────────┘  └──────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MongoDB Atlas                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Users   │  │    Books     │  │AccessRequests│  │ReadingLogs │ │
│  │          │  │ (with hidden │  │  (status,    │  │ (sessions, │ │
│  │          │  │  filename)   │  │   dates)     │  │  duration) │ │
│  └──────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       File System                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  backend/uploads/  (Random hex filenames — never exposed)    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Highlights

- Stateless JWT authentication with role-based protection
- Server-side PDF rendering: PDFs are NEVER sent to the client
- Per-page watermarked PNG delivery (one page at a time)
- Random hex filename storage prevents path traversal attacks
- Centralized watermark configuration
- In-memory LRU render cache (200 entries)
- Scheduled cron job for automatic access expiry
- Docker Compose support for easy deployment

---

# ⚙️ Backend Logic Explanation

The backend acts as the **system authority**.

### Core Responsibilities

**1. Authentication Layer**

- JWT issuance after login (7-day expiry)
- Token verification middleware (`protect`)
- Role-based route protection (`authorizeRoles`)
- Account blocking support (blocked users cannot log in)

**2. PDF Upload & Storage**

- Multer handles file uploads (PDF-only, 50MB limit)
- Files stored as random 32-character hex names (unguessable)
- Server-only fields (`filename`, `originalFilename`) have `select: false`
- Path traversal protection on all file access
- Automatic rollback if PDF metadata extraction fails

**3. PDF Metadata Extraction**

- Uses `pdfjs-dist` (v6, legacy build) to extract:
  - Total page count
  - Document metadata (title, author, subject, etc.)
- Upload fails if page count cannot be determined
- Falls back to PDF metadata if form fields are empty

**4. Server-Side Page Rendering**

- `GET /api/access/book/:bookId/page/:n` renders ONE page at a time
- Uses `@napi-rs/canvas` (Rust/Skia) for real canvas rendering
- Page rendered as watermarked PNG image (never the raw PDF)
- Per-stage logging for debugging
- In-memory LRU cache (200 entries) for repeated requests

**5. Access Workflow Engine**

- Store book request records with status tracking
- Librarian/Admin approval handling
- Generates time-bound 7-day access windows
- Validates permissions before every page render
- Prevents duplicate pending/approved requests

**6. Automation Engine**

- Cron job runs daily at midnight (`node-cron`)
- Detects expired permissions and updates status
- Maintains clean database state
- Also runs once on server start

**7. Analytics Engine**

- Tracks with aggregated data:
  - Total users, books, requests, active/expired access
  - Most accessed books (by `totalAccessCount`)
  - Top students (by approved access count)
- Reading session logging (start/stop with duration tracking)

**8. Notification Service**

- Sends approval email via Nodemailer
- Uses Gmail App Password authentication
- Sends email to student when access is approved

**9. Admin Controls**

- User management: update roles, delete users, block/unblock
- Role protection prevents self-demotion, last-admin deletion/blocking
- Cascading cleanup: deleting a user also removes their access requests

---

# 🎨 Frontend Logic Explanation

The frontend focuses on **role-driven UI rendering** and secure API interaction.

### Responsibilities

- Authentication UI with token management
- Conditional dashboard rendering by role
- **Premium full-screen e-book reader** with:
  - Floating glassmorphism toolbar (auto-hide on scroll)
  - Collapsible sidebar with book info
  - Right-side floating action buttons
  - Bottom page indicator pill
  - Keyboard shortcuts (↑↓ Ctrl+=/- F Esc)
  - Light/Dark theme toggle
  - Zoom controls (+, -, fit width, fit page)
  - Fullscreen mode
  - Lazy loading via IntersectionObserver
  - Canvas-based rendering (no Blob URLs, no `<img>` tags)
  - Per-page fade-in animations
- Book browsing interface with pagination
- Request submission flow with status indicators
- Live access countdown timer (updates every second)
- Admin analytics dashboard with Recharts bar chart
- Responsive design (desktop, tablet, mobile)

All sensitive validation remains backend-controlled.

---

# 👥 User Roles

### 🎓 Student

- Browse available books (paginated)
- Request access to books
- View request status (pending, approved, expired, rejected)
- Read approved books in the premium full-screen reader
- See remaining access time via live countdown
- Re-request expired or rejected books

### 📚 Librarian

- Upload new books (PDF upload with metadata extraction)
- Review pending student requests
- Approve or reject access requests
- Monitor active students per book
- View all books in the system

### 🛠️ Admin

- Full system control
- View analytics dashboard with charts
- Track most accessed books
- View top active students
- Manage all users (update roles, block/unblock, delete)
- Protected against self-demotion and last-admin deletion

---

# 🔐 Security Features

- **JWT-based stateless authentication** with 7-day token expiry
- **bcrypt password hashing** with salt rounds
- **Role-based API protection** at route level
- **Server-side PDF rendering**: the raw PDF file is NEVER sent to the client
- **Per-page image delivery**: each page is rendered as a watermarked PNG on the server
- **Random hex filename storage**: uploaded PDFs get unguessable 32-char hex names
- **`select: false` on filename fields**: never accidentally leaked via API responses
- **Path traversal protection**: all file access validated against the uploads directory
- **Time-limited permissions** stored in DB (7-day access window)
- **Automated expiry enforcement** via daily cron job (also runs on server start)
- **Account blocking support**: blocked users cannot log in
- **Cascading user deletion**: removing a user cleans up their access records
- **Secure environment variable handling** via dotenv
- **Per-page watermarking**: student identity embedded in every rendered page
- **No direct file exposure**: all content delivered through secured endpoints

---

# 📂 Project Structure

```
CloudRead/
│
├── backend/                          # Node + Express Backend
│   ├── config/
│   │   ├── db.js                     # MongoDB connection
│   │   ├── multer.js                 # File upload config (random hex names)
│   │   └── watermark.js              # Centralized watermark settings
│   │
│   ├── controllers/
│   │   ├── authController.js         # Register/Login with JWT
│   │   ├── bookController.js         # Book CRUD + PDF upload
│   │   ├── accessController.js       # Access workflow + page rendering
│   │   ├── adminController.js        # Admin analytics + user management
│   │   └── readingController.js      # Reading session logging
│   │
│   ├── models/
│   │   ├── User.js                   # User schema (name, email, role, status)
│   │   ├── Book.js                   # Book schema (hidden filename, metadata)
│   │   ├── AccessRequest.js          # Access request schema (status, dates)
│   │   └── ReadingLog.js             # Reading session tracking
│   │
│   ├── routes/
│   │   ├── authRoutes.js             # POST /register, /login
│   │   ├── bookRoutes.js             # CRUD endpoints with role protection
│   │   ├── accessRoutes.js           # Request, approve, reject, render page
│   │   └── adminRoutes.js            # Dashboard, users, analytics
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT verification
│   │   └── roleMiddleware.js         # Role-based access control
│   │
│   ├── services/
│   │   ├── pdfRenderer.js            # @napi-rs/canvas page renderer
│   │   └── pdfInfo.js                # pdfjs-dist metadata extraction
│   │
│   ├── cron/
│   │   └── expiryJob.js              # Daily access expiry automation
│   │
│   ├── utils/
│   │   └── sendEmail.js              # Nodemailer Gmail integration
│   │
│   ├── uploads/                      # Uploaded PDFs (random hex names)
│   ├── server.js                     # Express app entry point
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                         # React 19 Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx            # App layout with Navbar
│   │   │   ├── Navbar.jsx            # Responsive navbar with role badges
│   │   │   ├── ProtectedRoute.jsx    # Auth + role guard
│   │   │   ├── PublicRoute.jsx       # Redirect logged-in users
│   │   │   ├── PageWrapper.jsx       # Framer Motion page transitions
│   │   │   ├── Loader.jsx            # Loading spinner (inline + full)
│   │   │   ├── ScrollToTop.jsx       # Auto scroll to top on route change
│   │   │   ├── AccessCountdown.jsx   # Live access expiry countdown
│   │   │   ├── BookCard.jsx          # Book display card
│   │   │   └── reader/              # Premium e-book reader components
│   │   │       ├── ReaderToolbar.jsx      # Floating glassmorphism toolbar
│   │   │       ├── ReaderSidebar.jsx      # Collapsible book info sidebar
│   │   │       ├── PageCanvas.jsx         # Per-page canvas rendering
│   │   │       ├── FloatingActions.jsx    # Right-side action buttons
│   │   │       └── PageIndicator.jsx      # Bottom page counter pill
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx              # Landing page with timeline
│   │   │   ├── Login.jsx             # Authentication login
│   │   │   ├── Register.jsx          # User registration with role select
│   │   │   ├── StudentDashboard.jsx  # Browse books, request access
│   │   │   ├── LibrarianDashboard.jsx # Manage books + approve requests
│   │   │   ├── AdminDashboard.jsx    # Analytics + user management
│   │   │   ├── ActiveStudentsPage.jsx # View active students per book
│   │   │   └── BookViewer.jsx        # Premium full-screen reader
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Auth state management
│   │   │
│   │   ├── services/
│   │   │   └── api.js                # Axios instance with JWT interceptor
│   │   │
│   │   └── css/
│   │       ├── home.css              # Landing page styles
│   │       ├── authentication.css     # Login/Register styles
│   │       ├── student.css           # Student dashboard styles
│   │       ├── libraryan.css         # Librarian dashboard styles
│   │       ├── admin.css             # Admin dashboard styles
│   │       ├── activestudentbook.css  # Active students page styles
│   │       ├── navbar.css            # Navigation bar styles
│   │       └── reader.css            # Premium reader styles
│   │
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml                # Docker Compose setup
├── .gitignore
└── README.md
```

---

# 🔑 Environment Variables

Create a `.env` file in **backend/**

```env
# ─── Server ─────────────────────────────────────
PORT=5000
CLIENT_URL=http://localhost:3000

# ─── Database ───────────────────────────────────
MONGO_URI=your_mongodb_atlas_connection_string

# ─── Authentication ─────────────────────────────
JWT_SECRET=your_secure_random_secret_key

# ─── Email (Gmail App Password) ─────────────────
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### Environment Variables Reference

| Variable | Required | Description | Default |
|---|---|---|---|
| `PORT` | ✅ | Backend server port | `5000` |
| `MONGO_URI` | ✅ | MongoDB connection string (Atlas or local) | — |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing | — |
| `EMAIL_USER` | ❌ | Gmail address for approval notifications | — |
| `EMAIL_PASS` | ❌ | Gmail App Password | — |
| `CLIENT_URL` | ❌ | Frontend URL for CORS | `http://localhost:3000` |

> ⚠️ **Important**: Use a **strong random string** for `JWT_SECRET`. You can generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

# 🚀 How to Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20.x (for native ESM support)
- [npm](https://npmjs.com/) ≥ 9.x
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier works) or local MongoDB
- [Git](https://git-scm.com/)

### 1️⃣ Clone Repository

```bash
git clone https://github.com/jayeshpatel882006/CloudRead-Final-Year-Project.git
cd CloudRead-Final-Year-Project
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install

# Create environment file
# ⚠️ Edit this file with your actual values before proceeding
cp .env.example .env  # or create manually
```

**Example `.env` file:**
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/cloudread
JWT_SECRET=your_64_character_hex_string_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:3000
```

**Start the backend:**
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Backend runs at: **http://localhost:5000**

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at: **http://localhost:3000**

### Docker Deployment (Alternative)

```bash
# From project root
docker-compose up --build
```

This starts both frontend and backend containers.

### Ports Used

| Service | Port | URL |
|---|---|---|
| Frontend (React) | `3000` | http://localhost:3000 |
| Backend (Express) | `5000` | http://localhost:5000 |
| Database (MongoDB) | `27017` | Atlas / local |

### Database Setup

CloudRead uses **MongoDB Atlas** (recommended) or local MongoDB.

1. Create a free MongoDB Atlas cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write permissions
3. Whitelist your IP address (or use `0.0.0.0/0` for development)
4. Get your connection string and add it to `.env` as `MONGO_URI`

The database is created automatically on first connection. Collections are auto-created when the first document is inserted.

### Seed Data

No seed script is provided. To get started:

1. **Register** a student account at `/register`
2. **Login** as a librarian (register with role `librarian`)
3. **Upload** a PDF book from the librarian dashboard
4. **Request access** as a student and approve it as librarian
5. **Read** the book in the premium reader

---

# 📡 API Overview

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login, returns JWT | ❌ |

### Books

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/api/books` | Get all books (paginated) | ✅ | Any |
| `GET` | `/api/books/:id` | Get single book | ✅ | Any |
| `POST` | `/api/books` | Add book (multipart/form-data with `pdf` field) | ✅ | Librarian, Admin |
| `DELETE` | `/api/books/:id` | Delete book (also removes file) | ✅ | Admin |

### Access Requests

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `POST` | `/api/access` | Request book access | ✅ | Student |
| `GET` | `/api/access/my` | Get my access requests | ✅ | Student |
| `GET` | `/api/access` | Get all pending requests | ✅ | Librarian, Admin |
| `PUT` | `/api/access/approve/:id` | Approve request (7-day access) | ✅ | Librarian, Admin |
| `PUT` | `/api/access/reject/:id` | Reject request | ✅ | Librarian, Admin |
| `GET` | `/api/access/book/:bookId/info` | Get sanitized book metadata | ✅ | Student |
| `GET` | `/api/access/book/:bookId/page/:n` | Get watermarked page as PNG | ✅ | Student |

### Admin

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Get dashboard stats | ✅ | Admin |
| `GET` | `/api/admin/top-books` | Get most accessed books | ✅ | Admin |
| `GET` | `/api/admin/top-students` | Get top active students | ✅ | Admin |
| `GET` | `/api/admin/book-active/:bookId` | Get active students for a book | ✅ | Librarian, Admin |
| `GET` | `/api/admin/users` | Get all users (paginated) | ✅ | Admin |
| `PUT` | `/api/admin/users/:id/role` | Update user role | ✅ | Admin |
| `DELETE` | `/api/admin/users/:id` | Delete user | ✅ | Admin |
| `PUT` | `/api/admin/users/:id/block` | Toggle user block status | ✅ | Admin |

### API Response Format

**Success (PNG page):**
```
Content-Type: image/png
[Binary PNG data]
```

**Success (JSON):**
```json
{
  "books": [...],
  "currentPage": 1,
  "totalPages": 5,
  "totalBooks": 25
}
```

**Error:**
```json
{
  "page": 3,
  "stage": "accessLookup",
  "message": "Access denied",
  "code": null
}
```

---

# 🖼️ Screenshots

> 📸 Screenshots coming soon. Below are placeholders for the documentation.

## Landing Page

![Landing Page](docs/screenshots/landing.png)

*Hero section with animated timeline showing the access workflow.*

## Login

![Login](docs/screenshots/login.png)

*Clean authentication page with password visibility toggle.*

## Student Dashboard

![Student Dashboard](docs/screenshots/student-dashboard.png)

*Paginated book listing with request/approval status indicators and countdown timer.*

## Premium PDF Reader

![PDF Reader](docs/screenshots/pdf-reader.png)

*Full-screen reader with glassmorphism toolbar, floating actions, and page indicator.*

## Librarian Dashboard

![Librarian Dashboard](docs/screenshots/librarian-dashboard.png)

*Upload books, manage pending requests, and view all books.*

## Admin Dashboard

![Admin Dashboard](docs/screenshots/admin-dashboard.png)

*Analytics with bar charts and user management table.*

## Book Request Workflow

![Workflow](docs/screenshots/workflow.png)

*Student requests → Librarian approves → 7-day access granted → Auto-expired.*

---

# 🔮 Future Enhancements

- **📄 OCR Search** — Full-text search across uploaded PDFs
- **🤖 AI Recommendations** — Machine learning-based book suggestions
- **📝 AI Summaries** — Auto-generated book summaries using LLMs
- **🔖 Bookmarks** — Save and manage reading positions
- **📋 Notes & Annotations** — Highlight and annotate PDF pages
- **📊 Reading Analytics** — Track reading time, pages read, completion rate
- **📱 Mobile App** — React Native companion app
- **📶 Offline Reading** — Cache pages for offline access
- **🔍 Advanced Search** — Filter books by author, category, description
- **🗂️ Categories & Tags** — Rich metadata classification system
- **👥 Multi-Institution Support** — Tenant-based book libraries
- **🔗 OAuth Login** — Google / Institution SSO integration
- **⚡ Redis Caching** — Performance optimization for analytics
- **🌐 WebSocket** — Live reading session tracking
- **📈 Reading Heatmaps** — Visual engagement analytics
- **🎯 Smart Recommendations** — Personalized book discovery engine

---

# 🎓 Academic Value

CloudRead demonstrates strong real-world engineering concepts:

- Full-stack MERN architecture with modern React patterns
- Server-side PDF rendering pipeline (pdfjs-dist + native Canvas)
- Authentication design patterns (JWT, bcrypt, role-based guards)
- Access lifecycle management (request → approve → expire)
- Secure file upload and storage (randomized names, path protection)
- Digital watermarking and copyright protection
- Backend-driven analytics modeling
- Cron-based automation systems
- Docker containerization
- Cloud database integration (MongoDB Atlas)
- Premium UI/UX with responsive design
- IntersectionObserver-based lazy loading
- Canvas-based document rendering (no Blob URLs, no `<img>` downloads)

This makes it a **high-value academic + portfolio project** for:

- Final year projects
- Cloud computing coursework
- Software engineering portfolios
- Internship demonstrations
- Full-stack development interviews

---

# 🐳 Docker Deployment

### Prerequisites

- [Docker](https://docker.com) ≥ 24.x
- [Docker Compose](https://docs.docker.com/compose/) ≥ 2.x

### Deploy

```bash
# From project root
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The Docker setup:
- Builds the frontend React app as static files served by Nginx
- Runs the backend Express server with `node server.js`
- Exposes frontend on port `3000` and backend on port `5000`
- Environment variables are passed through `docker-compose.yml`

---

# ❓ Common Errors & Troubleshooting

### `pdfjs-dist` worker error
```
Error: Setting up fake worker failed
```
✅ The project uses the legacy build (`pdf.mjs`) with a file:// worker URL. If this fails, ensure `node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs` exists. Reinstall with `npm install`.

### Multer upload fails
```
Only PDF files are allowed
```
✅ CloudRead only accepts `application/pdf` mimetype. Ensure the file you're uploading is a valid PDF.

### MongoDB connection error
```
MongoServerError: bad auth Authentication failed
```
✅ Check your `MONGO_URI` connection string. Ensure the username and password are URL-encoded (special characters like `@`, `:`, `/` must be percent-encoded).

### JWT token expired
```
Not authorized, token failed
```
✅ Tokens expire after 7 days. Log out and log in again to get a fresh token.

### Docker build issues on Windows
```
executor failed running [...]: not found
```
✅ Ensure Git Bash line endings are handled: set `autocrlf` to `input` in `.gitattributes` or before cloning.

### PDF page not rendering
```
[pdfRenderer] [5/7] renderPage FAILED
```
✅ The PDF might be a scanned document (image-only) or use unsupported features. Check the backend logs for the specific error code.

---

# 👨‍💻 Development Team

**Jayesh Patel** — Full-Stack Developer & Architect

---

⭐ If you found this project useful, consider starring the repository.

# ☁️ CloudRead — Secure Cloud Digital Library

![MERN](https://img.shields.io/badge/Stack-MERN-2ecc71)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![Status](https://img.shields.io/badge/Project-Production--Ready-success)

**CloudRead** is a secure, cloud-based digital library platform built on the MERN stack.
It enables controlled, role-based access to digital books with automated expiry, analytics, and workflow-driven approvals — designed for academic institutions and scalable cloud deployments.

---

# 📘 Project Overview

CloudRead solves a common institutional problem:
**How do you securely distribute digital books while preventing permanent access and misuse?**

The system introduces:

- Controlled access approval workflow
- Time-restricted reading permissions
- Secure document validation before viewing
- Backend-driven analytics for institutional insights
- Automated expiry to remove manual tracking

This makes it suitable for:

- Universities
- Digital libraries
- Research labs
- Training portals

---

# 🏗️ System Architecture

```
React Frontend  →  Express API Layer  →  MongoDB Atlas
        ↓                  ↓
   Auth + UI        Business Logic
        ↓                  ↓
   JWT Storage       Cron Jobs + Email Service
        ↓                  ↓
 Secure PDF Access Validation → Google Drive File Links
```

### Architecture Highlights

- Stateless JWT authentication
- RESTful service layer
- Database-driven access validation
- Backend-controlled business logic
- Scheduled automation for expiry enforcement
- External storage integration (Google Drive)

---

# ⚙️ Backend Logic Explanation

The backend acts as the **system authority**.

### Core Responsibilities

**1. Authentication Layer**

- JWT issuance after login
- Token verification middleware
- Role-based route protection

**2. Access Workflow Engine**

- Store book request records
- Librarian/Admin approval handling
- Generate time-bound access windows
- Validate permissions before PDF access

**3. Automation Engine**

- Cron job runs daily
- Detects expired permissions
- Revokes access automatically
- Maintains clean database state

**4. Analytics Engine**

- Tracks reading sessions on backend
- Calculates:
  - Total reading duration
  - Most accessed books
  - Top readers

- Provides structured admin insights

**5. Notification Service**

- Sends approval email via Nodemailer
- Uses Gmail App Password authentication

---

# 🎨 Frontend Logic Explanation

The frontend focuses on **role-driven UI rendering** and secure API interaction.

### Responsibilities

- Authentication UI and token handling
- Conditional dashboard rendering by role
- Book browsing interface
- Request submission flow
- Access timer display for users
- Admin analytics visualization
- Secure PDF viewer routing

All sensitive validation remains backend-controlled.

---

# 👥 User Roles

### 🎓 Student

- Browse available books
- Request access
- Read approved books
- View remaining access time

### 📚 Librarian

- Review student requests
- Approve or reject access
- Monitor usage

### 🛠️ Admin

- Full system control
- View analytics dashboard
- Track reading trends
- Manage users and books

---

# 🔐 Security Features

- JWT-based stateless authentication
- bcrypt password hashing
- Role-based API protection
- Backend validation before every PDF access
- Time-limited permissions stored in DB
- Automated expiry enforcement
- Secure environment variable handling
- No direct file exposure (Drive links validated)

---

# 📂 Project Structure

```
CloudRead/
│
├── client/                     # React Frontend
│   ├── components/
│   ├── pages/
│   ├── context/
│   └── services/
│
├── server/                     # Node + Express Backend
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── cron/
│   ├── utils/
│   └── config/
│
├── .env
├── package.json
└── README.md
```

---

# 🔑 Environment Variables

Create a `.env` file in **server/**

```
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:3000
GOOGLE_DRIVE_BASE_URL=your_drive_link_prefix
```

---

# 🚀 How to Run Locally

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/cloudread.git
cd cloudread
```

### 2️⃣ Backend Setup

```bash
cd server
npm install
npm run dev
```

### 3️⃣ Frontend Setup

```bash
cd client
npm install
npm start
```

App runs at:

```
Frontend → http://localhost:3000
Backend  → http://localhost:5000
```

---

# 🎓 Academic Value

CloudRead demonstrates strong real-world engineering concepts:

- Full-stack MERN architecture
- Authentication design patterns
- Access lifecycle management
- Backend-driven analytics modeling
- Secure document distribution
- Cron-based automation systems
- Role-based enterprise workflows
- Cloud database integration

This makes it a **high-value academic + portfolio project** for:

- Final year projects
- Cloud computing coursework
- Software engineering portfolios
- Internship demonstrations

---

# 🔮 Future Improvements

- PDF streaming instead of static Drive links
- Redis caching for analytics
- WebSocket live reading timer
- OAuth login (Google / Institution SSO)
- Docker deployment
- Kubernetes-ready architecture
- Multi-institution support
- Recommendation engine
- Reading heatmaps & engagement graphs

---

# 👨‍💻 Development Team

**Jayesh Patel**

---

⭐ If you found this project useful, consider starring the repository.

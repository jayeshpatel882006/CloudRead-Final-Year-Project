📚 CloudRead
Cloud-Based Digital Library Management System (MERN Stack)
🚀 Project Overview

CloudRead is a cloud-based digital library system built using the MERN stack.
It provides secure, role-based, time-limited access to digital books with automated expiry, reading analytics, and administrative insights.

This system is designed as a Final Year B.Tech Project (Cloud Computing) and demonstrates:

Secure authentication

Role-based access control

Digital resource management

Automated expiry using cron jobs

Reading behavior analytics

Email notifications

Admin dashboard statistics

🏗 Tech Stack
Backend

Node.js

Express.js

MongoDB Atlas

JWT Authentication

bcrypt (password hashing)

node-cron (auto expiry)

nodemailer (email notifications)

Frontend

React.js (To be integrated)

Cloud Services

MongoDB Atlas (Database)

Google Drive (PDF storage)

Gmail SMTP (Email notifications)

👥 User Roles
👨‍🎓 Student

Register / Login

View books

Request access

Read books (if approved)

View access history

Reading sessions tracked

👩‍💼 Librarian

Add books

View access requests

Approve / Reject requests

👑 Admin

View dashboard statistics

Monitor system usage

View analytics

Track top readers & books

🔐 Authentication & Security

JWT-based authentication

Role-based route protection

Password hashing using bcrypt

Secure book access validation

Backend-controlled reading session duration

Email notification on approval

📚 Core Features
1️⃣ Book Management

Add / Delete books

Store Google Drive PDF links

Track total access count

2️⃣ Access Request Workflow

Student requests book

Librarian approves request

Access valid for 7 days

Secure endpoint validates access before returning PDF

3️⃣ Automated Expiry System

Cron job runs daily

Expired access automatically updated

Prevents unauthorized access

4️⃣ Reading Analytics

Session-based tracking

Backend calculates reading duration

Multiple sessions supported

Tracks:

Total reading time

Active readers

Book engagement

5️⃣ Admin Analytics Dashboard APIs

Total users

Total books

Total access requests

Active vs expired access

Most accessed books

Top students

Total reading time

6️⃣ Email Notification

Sent when access is approved

Uses Gmail App Password authentication

📁 Backend Folder Structure
backend/
│
├── config/
│ └── db.js
│
├── models/
│ ├── User.js
│ ├── Book.js
│ ├── AccessRequest.js
│ └── ReadingLog.js
│
├── controllers/
│ ├── authController.js
│ ├── bookController.js
│ ├── accessController.js
│ ├── readingController.js
│ └── adminController.js
│
├── routes/
│ ├── authRoutes.js
│ ├── bookRoutes.js
│ ├── accessRoutes.js
│ ├── readingRoutes.js
│ └── adminRoutes.js
│
├── middleware/
│ ├── authMiddleware.js
│ └── roleMiddleware.js
│
├── cron/
│ └── expiryJob.js
│
├── utils/
│ └── sendEmail.js
│
├── server.js
└── .env
🔄 System Workflow
User → Login (JWT)
↓
Student requests book
↓
Librarian approves
↓
Access granted for 7 days
↓
Secure endpoint validates access
↓
Reading session tracked
↓
Cron job auto-expires access
↓
Admin monitors analytics
↓
Email notification sent
⚙️ Environment Variables

Create a .env file in backend root:

PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password

⚠️ Use Gmail App Password, not normal Gmail password.

▶️ How to Run the Backend
1️⃣ Install Dependencies
npm install
2️⃣ Start Server
npm run dev

Server runs at:

http://localhost:5000
🧠 Key Concepts Demonstrated

Role-Based Access Control (RBAC)

JWT Authentication

Secure Digital Resource Access

Automated Expiry using Cron

Backend Session Analytics

MongoDB Aggregation

Email Integration

Cloud Database Deployment

🎓 Viva Explanation (Short Summary)

CloudRead is a role-based digital access management system that provides time-limited secure access to digital books with automated expiry, session-based reading analytics, and administrative monitoring.

📈 Project Level

CloudRead demonstrates:

✔ Secure backend architecture
✔ Enterprise-style workflow
✔ Cloud integration
✔ Automation
✔ Analytics system
✔ Production-ready structure

🚀 Future Improvements

Refresh tokens

Swagger API documentation

React Admin Dashboard

Payment integration for fines

File storage via AWS S3

Microservices architecture

👨‍💻 Developed By

Jayesh Patel & Team (Ashish , Vishwa ,Suraj)
B.Tech (Cloud Computing)
Final Year Project

# ☁️ CloudRead

![MERN Stack](https://img.shields.io/badge/Stack-MERN-green)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248)
![JWT Auth](https://img.shields.io/badge/Auth-JWT-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

**CloudRead** is a full-stack MERN application that provides a secure, role-based digital reading platform.
It enables users to request access to books, allows admins to approve requests, and automatically manages time-limited access with analytics and notifications.

---

## 🚀 Features

### 🔐 Authentication & Security

* JWT-based authentication
* Secure password hashing
* Protected API routes
* Role-based access control (Admin / User)

### 📚 Book Access Workflow

* Users can request books
* Admin approval system
* 7-day time-limited reading access
* Automatic access expiry

### ⏱️ Automation

* Cron job for automatic expiry handling
* Scheduled cleanup of expired access records

### 📊 Analytics

* Reading session tracking
* User engagement insights
* Admin analytics endpoints

### 🛠️ Admin Capabilities

* Admin dashboard APIs
* Manage users and permissions
* Approve or reject book requests
* Monitor system usage

### 📧 Notifications

* Email alerts for:

  * Book approval
  * Expiry reminders
  * Account updates

---

## 🏗️ Tech Stack

**Frontend**

* React.js
* Axios
* React Router
* Context API / Redux (if used)

**Backend**

* Node.js
* Express.js
* MongoDB + Mongoose
* JWT Authentication
* Node Cron

**Other Tools**

* Nodemailer (email service)
* dotenv
* bcrypt

---

## 📂 Project Structure

```
CloudRead/
│
├── client/            # React frontend
├── server/            # Node/Express backend
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── cron/
│   └── utils/
│
├── .env
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/cloudread.git
cd cloudread
```

### 2️⃣ Setup Backend

```bash
cd server
npm install
```

Create a `.env` file in **server/**

```
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
CLIENT_URL=http://localhost:3000
```

Run backend:

```bash
npm run dev
```

---

### 3️⃣ Setup Frontend

```bash
cd client
npm install
npm start
```

---

## 🔌 API Overview

| Method | Endpoint                        | Description           |
| ------ | ------------------------------- | --------------------- |
| POST   | `/api/auth/register`            | Register user         |
| POST   | `/api/auth/login`               | Login user            |
| GET    | `/api/books`                    | Fetch available books |
| POST   | `/api/request/:bookId`          | Request book access   |
| PATCH  | `/api/admin/approve/:requestId` | Approve request       |
| GET    | `/api/admin/analytics`          | View system analytics |

---

## 🧠 How It Works

1. User signs up and logs in
2. User requests a book
3. Admin approves request
4. System grants **7-day access**
5. Cron job checks expiry daily
6. Access is automatically revoked after time ends
7. Email notifications are sent during the lifecycle

---

## 📸 Future Improvements

* Payment integration for premium access
* In-browser PDF reader
* Bookmarking & notes
* Reading streak tracking
* Recommendation engine

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a new branch
3. Commit your changes
4. Push and open a PR

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👨‍💻 Author

**CloudRead Team**
Built with ❤️ using the MERN Stack

---

If you want, I can also generate:

✅ A **short GitHub description + topics list**
✅ A **professional repo banner**
✅ API documentation in Swagger format
✅ README with screenshots placeholders

Just tell me which one you want next.

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import accessRoutes from "./routes/accessRoutes.js";
import startExpiryJob from "./cron/expiryJob.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

// Connect Database
connectDB();
startExpiryJob();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/admin", adminRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("🚀 CloudRead API Running.....");
});

const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 Server running on port ${PORT}`);
});

import mongoose from "mongoose";

const readingLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    accessRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccessRequest",
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    durationInSeconds: {
      type: Number,
      default: 0,
    },
    sessionActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const ReadingLog = mongoose.model("ReadingLog", readingLogSchema);
export default ReadingLog;

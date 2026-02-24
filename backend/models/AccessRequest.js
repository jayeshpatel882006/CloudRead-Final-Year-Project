import mongoose from "mongoose";

const accessRequestSchema = new mongoose.Schema(
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
    requestDate: {
      type: Date,
      default: Date.now,
    },
    accessStartDate: Date,
    accessEndDate: Date,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const AccessRequest = mongoose.model("AccessRequest", accessRequestSchema);

export default AccessRequest;

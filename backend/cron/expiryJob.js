import cron from "node-cron";
import AccessRequest from "../models/AccessRequest.js";

// Run every day at midnight
const startExpiryJob = () => {
  //   cron.schedule("*/1 * * * *", async () => { //Running Evry 1 minute for testing
  cron.schedule("0 0 * * *", async () => {
    // Every day at midnight
    console.log("⏰ Running Expiry Job...");

    try {
      const expiredRequests = await AccessRequest.updateMany(
        {
          status: "approved",
          accessEndDate: { $lt: new Date() },
        },
        { $set: { status: "expired" } },
      );

      console.log(`✅ Expired ${expiredRequests.modifiedCount} access records`);
    } catch (error) {
      console.error("❌ Expiry Job Error:", error.message);
    }
  });
};

export default startExpiryJob;

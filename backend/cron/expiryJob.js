import cron from "node-cron";
import AccessRequest from "../models/AccessRequest.js";

const runExpiryJob = async () => {
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
};

// Run every day at midnight
const startExpiryJob = () => {
  //   cron.schedule("*/1 * * * *", async () => { //Running Evry 1 minute for testing
  cron.schedule("0 0 * * *", runExpiryJob);
};

runExpiryJob();
export default startExpiryJob;

export const startReading = async (req, res) => {
  try {
    const { bookId, accessRequestId } = req.body;

    const log = await ReadingLog.create({
      user: req.user._id,
      book: bookId,
      accessRequest: accessRequestId,
    });

    res.status(201).json({
      message: "Reading session started",
      logId: log._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const stopReading = async (req, res) => {
  try {
    const { logId } = req.body;

    const log = await ReadingLog.findById(logId);

    if (!log || !log.sessionActive) {
      return res.status(400).json({ message: "Invalid or inactive session" });
    }

    const closedTime = new Date();

    const duration = (closedTime - log.openedAt) / 1000; // calculate in seconds

    log.closedAt = closedTime;
    log.durationInSeconds = Math.floor(duration);
    log.sessionActive = false;

    await log.save();

    res.json({
      message: "Reading session ended",
      durationInSeconds: log.durationInSeconds,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

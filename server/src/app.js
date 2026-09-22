const express = require("express");
const cors = require("cors");
const trackRoutes = require("./routes/track.routes");
const authRoutes = require("./routes/auth.routes");
const blobRoutes = require("./routes/blob.routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");
const app = express();

// 1. Global middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// 2. Routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/tracks", trackRoutes);
app.use("/api/blob", blobRoutes);

// 3. Error handling — must be LAST
app.use(notFound);
app.use(errorHandler);
module.exports = app;

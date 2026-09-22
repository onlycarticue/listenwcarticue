const app = require("../server/src/app");
const connectDB = require("../server/src/config/db");

let databaseConnection;

module.exports = async (req, res) => {
  try {
    databaseConnection ||= connectDB();
    await databaseConnection;
    return app(req, res);
  } catch (error) {
    databaseConnection = undefined;
    console.error("API initialization failed:", error.message);
    return res.status(500).json({ message: "Database connection failed" });
  }
};

const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "../../uploads/audio");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`);
  },
});

const audioUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isMp3 = extension === ".mp3" && ["audio/mpeg", "audio/mp3", "application/octet-stream"].includes(file.mimetype);
    callback(isMp3 ? null : new Error("รองรับเฉพาะไฟล์ MP3 เท่านั้น"), isMp3);
  },
});

module.exports = { audioUpload };

const path = require("path");
const multer = require("multer");

const storage = multer.memoryStorage();

const audioUpload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isMp3 = extension === ".mp3" && ["audio/mpeg", "audio/mp3", "application/octet-stream"].includes(file.mimetype);
    callback(isMp3 ? null : new Error("รองรับเฉพาะไฟล์ MP3 เท่านั้น"), isMp3);
  },
});

module.exports = { audioUpload };

const express = require("express");
const {
  getTracks,
  getTrackById,
  createTrack,
  updateTrack,
  deleteTrack,
  downloadTrack,
  uploadAudio,
} = require("../controllers/track.controller");
const { requireAuth, requireAdmin } = require("../middlewares/auth.middleware");
const { audioUpload } = require("../middlewares/upload.middleware");

const router = express.Router();

router.get("/", getTracks);
router.get("/:id", getTrackById);
router.post("/", requireAuth, requireAdmin, createTrack);
router.put("/:id", requireAuth, requireAdmin, updateTrack);
router.delete("/:id", requireAuth, requireAdmin, deleteTrack);
router.post("/:id/audio", requireAuth, requireAdmin, audioUpload.single("audio"), uploadAudio);
router.post("/:id/download", downloadTrack);

module.exports = router;

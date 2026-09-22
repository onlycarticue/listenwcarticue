const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    album: { type: String, default: "", trim: true },
    genre: { type: String, default: "General", trim: true },
    description: { type: String, default: "", trim: true },
    durationSec: { type: Number, required: true, min: 1 },
    coverArt: { type: String, default: "" },
    audioUrl: { type: String, default: "" },
    license: {
      type: String,
      enum: ["original", "cc-by", "public-domain"],
      default: "original",
    },
    isFeatured: { type: Boolean, default: false },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Track", trackSchema);
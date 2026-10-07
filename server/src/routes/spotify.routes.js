const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  getArtistAlbums,
  getTrackEmbedMetadata,
  getSpotifyLibrary,
  addTrackToSpotifyLibrary,
  removeTrackFromSpotifyLibrary,
} = require("../controllers/spotify.controller");

const router = express.Router();

router.get("/albums", getArtistAlbums);
router.get("/embed-track/:id", getTrackEmbedMetadata);
router.get("/library", requireAuth, getSpotifyLibrary);
router.post("/library", requireAuth, addTrackToSpotifyLibrary);
router.delete("/library/:id", requireAuth, removeTrackFromSpotifyLibrary);

module.exports = router;

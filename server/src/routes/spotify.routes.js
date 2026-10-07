const express = require("express");
const { getArtistAlbums, getTrackEmbedMetadata } = require("../controllers/spotify.controller");

const router = express.Router();

router.get("/albums", getArtistAlbums);
router.get("/embed-track/:id", getTrackEmbedMetadata);

module.exports = router;

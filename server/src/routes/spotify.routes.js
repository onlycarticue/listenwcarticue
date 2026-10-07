const express = require("express");
const { getArtistAlbums } = require("../controllers/spotify.controller");

const router = express.Router();

router.get("/albums", getArtistAlbums);

module.exports = router;

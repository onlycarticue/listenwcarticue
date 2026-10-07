const ARTIST_ID = "0AvGycOEDZTaBFLCaiGd9S";
const API_BASE = "https://api.spotify.com/v1";

let cachedToken = "";
let tokenExpiresAt = 0;

const getAccessToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    const error = new Error("Spotify API ยังไม่ได้ตั้งค่า กรุณากำหนด SPOTIFY_CLIENT_ID และ SPOTIFY_CLIENT_SECRET ใน server/.env");
    error.status = 503;
    throw error;
  }

  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = new Error("Spotify ยืนยันตัวตน API ไม่สำเร็จ ตรวจสอบ Client ID/Secret และสถานะ Spotify Developer app");
    error.status = 502;
    throw error;
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Math.max(0, data.expires_in - 60) * 1000;
  return cachedToken;
};

const getArtistAlbums = async (req, res, next) => {
  try {
    const token = await getAccessToken();
    const albums = [];
    const seenIds = new Set();
    let offset = 0;
    let hasMore = true;

    while (hasMore && albums.length < 1000) {
      const url = new URL(`${API_BASE}/artists/${ARTIST_ID}/albums`);
      url.searchParams.set("include_groups", "album,single,compilation");
      url.searchParams.set("market", "TH");
      url.searchParams.set("limit", "50");
      url.searchParams.set("offset", String(offset));

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const error = new Error("Spotify โหลดรายการอัลบั้มไม่สำเร็จ");
        error.status = response.status === 429 ? 503 : 502;
        throw error;
      }

      const data = await response.json();
      for (const album of data.items || []) {
        if (seenIds.has(album.id)) continue;
        seenIds.add(album.id);
        albums.push({
          id: album.id,
          name: album.name,
          releaseDate: album.release_date,
          albumType: album.album_type,
          totalTracks: album.total_tracks,
          image: album.images?.[0]?.url || "",
          spotifyUrl: album.external_urls?.spotify || `https://open.spotify.com/album/${album.id}`,
        });
      }
      offset += (data.items || []).length;
      hasMore = Boolean(data.next) && (data.items || []).length > 0;
    }

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json({ albums });
  } catch (error) {
    next(error);
  }
};

const getTrackEmbedMetadata = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^[A-Za-z0-9]{22}$/.test(id)) {
      return res.status(400).json({ message: "Invalid Spotify track ID" });
    }

    const url = new URL("https://open.spotify.com/oembed");
    url.searchParams.set("url", `https://open.spotify.com/track/${id}`);
    const response = await fetch(url);
    if (!response.ok) {
      const error = new Error("Spotify โหลดข้อมูลเพลงที่กำลังเล่นไม่สำเร็จ");
      error.status = response.status === 404 ? 404 : 502;
      throw error;
    }

    const data = await response.json();
    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.json({ title: data.title, artist: data.author_name, coverArt: data.thumbnail_url || "" });
  } catch (error) {
    next(error);
  }
};

const getSpotifyLibrary = async (req, res, next) => {
  try {
    const User = require("../models/user.model");
    const user = await User.findById(req.userId).select("spotifyLibrary");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ library: user.spotifyLibrary || [] });
  } catch (error) {
    next(error);
  }
};

const addTrackToSpotifyLibrary = async (req, res, next) => {
  try {
    const User = require("../models/user.model");
    const { spotifyId, title, artist, durationSec, coverArt } = req.body;
    if (!/^[A-Za-z0-9]{22}$/.test(String(spotifyId || "")) || !title || !artist) {
      return res.status(400).json({ message: "Valid Spotify track ID, title and artist are required" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.spotifyLibrary.some((track) => track.spotifyId === spotifyId)) {
      user.spotifyLibrary.push({
        spotifyId,
        title: String(title).trim().slice(0, 200),
        artist: String(artist).trim().slice(0, 200),
        durationSec: Math.max(0, Number(durationSec) || 0),
        coverArt: typeof coverArt === "string" ? coverArt.slice(0, 1000) : "",
        spotifyUrl: `https://open.spotify.com/track/${spotifyId}`,
      });
      await user.save();
    }

    res.json({ library: user.spotifyLibrary });
  } catch (error) {
    next(error);
  }
};

const removeTrackFromSpotifyLibrary = async (req, res, next) => {
  try {
    const User = require("../models/user.model");
    if (!/^[A-Za-z0-9]{22}$/.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid Spotify track ID" });
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $pull: { spotifyLibrary: { spotifyId: req.params.id } } },
      { new: true }
    ).select("spotifyLibrary");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ library: user.spotifyLibrary || [] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getArtistAlbums,
  getTrackEmbedMetadata,
  getSpotifyLibrary,
  addTrackToSpotifyLibrary,
  removeTrackFromSpotifyLibrary,
};

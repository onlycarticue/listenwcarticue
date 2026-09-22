const Track = require("../models/track.model");
const { put } = require("@vercel/blob");

const getTracks = async (req, res, next) => {
  try {
    const tracks = await Track.find().sort({ createdAt: -1 });
    res.json(tracks);
  } catch (error) {
    next(error);
  }
};

const getTrackById = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }
    res.json(track);
  } catch (error) {
    next(error);
  }
};

const createTrack = async (req, res, next) => {
  try {
    const { title, artist, album, genre, description, durationSec, coverArt, audioUrl, isFeatured } = req.body;

    if (!title || !artist || durationSec == null) {
      return res.status(400).json({ message: "Title, artist and duration are required" });
    }

    const track = await Track.create({
      title: title.trim(),
      artist: artist.trim(),
      album: album || "",
      genre: genre || "General",
      description: description || "",
      durationSec: Number(durationSec),
      coverArt: coverArt || "",
      audioUrl: audioUrl || "",
      isFeatured: !!isFeatured,
    });

    res.status(201).json(track);
  } catch (error) {
    next(error);
  }
};

const updateTrack = async (req, res, next) => {
  try {
    const updatedTrack = await Track.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedTrack) {
      return res.status(404).json({ message: "Track not found" });
    }

    res.json(updatedTrack);
  } catch (error) {
    next(error);
  }
};

const deleteTrack = async (req, res, next) => {
  try {
    const deletedTrack = await Track.findByIdAndDelete(req.params.id);
    if (!deletedTrack) {
      return res.status(404).json({ message: "Track not found" });
    }

    res.json({ message: "Track deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const downloadTrack = async (req, res, next) => {
  try {
    const track = await Track.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }
    res.json({ title: track.title, downloads: track.downloads });
  } catch (error) {
    next(error);
  }
};

const uploadAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "กรุณาเลือกไฟล์ MP3" });
    }

    const track = await Track.findById(req.params.id);
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }

    const blob = await put(`audio/${req.file.originalname}`, req.file.buffer, {
      access: "public",
      contentType: req.file.mimetype,
      addRandomSuffix: true,
    });
    track.audioUrl = blob.url;
    await track.save();
    res.json(track);
  } catch (error) {
    next(error);
  }
};

module.exports = { getTracks, getTrackById, createTrack, updateTrack, deleteTrack, downloadTrack, uploadAudio };
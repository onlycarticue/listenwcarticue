const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    duration: { type: Number, required: true }, // ความยาวเพลง (วินาที)
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    albumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' }, // บางเพลงอาจไม่มีอัลบั้ม (Single)
    genreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Genre' },
    audioUrl: { type: String, required: true },
    coverUrl: { type: String, default: '' },
    playCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Song', songSchema);
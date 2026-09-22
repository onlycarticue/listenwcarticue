const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coverUrl: { type: String, default: '' },
    releaseDate: { type: Date, default: Date.now },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Album', albumSchema);
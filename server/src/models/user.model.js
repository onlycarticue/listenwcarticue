const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['user', 'artist', 'admin'], 
      default: 'user' 
    },
    avatarUrl: { type: String, default: '' },
    followedArtists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    spotifyLibrary: [{
      spotifyId: { type: String, required: true },
      title: { type: String, required: true },
      artist: { type: String, required: true },
      durationSec: { type: Number, default: 0 },
      coverArt: { type: String, default: '' },
      spotifyUrl: { type: String, required: true },
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

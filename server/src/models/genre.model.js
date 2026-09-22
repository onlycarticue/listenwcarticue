const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    iconUrl: { type: String, default: '' },
    color: { type: String, default: '#000000' } // โค้ดสีสำหรับแสดงผลใน UI
  },
  { timestamps: true }
);

module.exports = mongoose.model('Genre', genreSchema);
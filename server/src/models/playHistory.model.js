const mongoose = require('mongoose');

const playHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true }
    // ไม่ต้องสร้างฟิลด์ playedAt แยก เพราะ timestamps: true จะสร้าง createdAt ให้อัตโนมัติเวลาที่บันทึก
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlayHistory', playHistorySchema);
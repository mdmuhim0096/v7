// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },

  type: {
    type: String,
    enum: ['like', 'comment', 'follow', 'message', 'mention', 'reply', 'post', 'report', 'cLike', 'cLove', 'cAngry', 'cHaha', 'cCare', 'cSad', 'cWow', 'love', 'sad', 'wow', 'angry', 'haha', 'care'],
    required: true
  },

  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },

  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },

  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },

  text: {
    type: String
  },

  isRead: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);

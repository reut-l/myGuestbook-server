const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A photo must have a filename'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  event: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event',
    required: [true, 'A photo must belong to an event'],
  },
  taggedUsers: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  ],
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
});

photoSchema.index({ event: 1 });

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;

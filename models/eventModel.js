const mongoose = require('mongoose');
const validator = require('validator');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for the event'],
    trim: true,
  },
  owner: {
    type: String,
    trim: true,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'An event must be created by a specific user'],
  },
  date: {
    type: Date,
    required: [true, "Please provide the event's date"],
  },
  timeOfDay: {
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
  },
  venue: {
    type: String,
    trim: true,
  },
  guestsPhones: {
    type: [
      {
        type: String,
        trim: true,
        validate: [
          validator.isMobilePhone,
          'Please enter a valid mobile phone number',
        ],
      },
    ],
    select: false,
  },
  imageCover: {
    type: String,
  },
});

eventSchema.index({ date: -1 });

// DOCUMENT MIDDLEWARES
// 1) When event doc is created:
// Add this event to the user who created it, as another event created by him (upadting User Model)
eventSchema.pre('save', async function (next) {
  await mongoose.model('User').findByIdAndUpdate(this.user, {
    $addToSet: { eventsAsCreator: this._id },
  });
  next();
});

// QUERY MIDDLEWARES
// 1) When event doc is queried and updated:
// Add this event to the UPDATED user, as another event created by him (upadting User Model)
eventSchema.pre('findOneAndUpdate', async function (next) {
  if (!this._update.user) return next();

  const docToUpdate = await this.model.findOne(this.getQuery());

  const userId = this._update.user;
  await mongoose.model('User').findByIdAndUpdate(userId, {
    $addToSet: { eventsAsCreator: docToUpdate._id },
  });
  next();
});

// STATIC FUNCTIONS
// 1) Check if user's phone number is in an event: search user by event => by their phone number
eventSchema.statics.searchGuest = async function (phone, event) {
  let pipeline = [];

  if (event) {
    const eventId = mongoose.Types.ObjectId(event);
    pipeline.push({ $match: { _id: eventId } });
  }

  pipeline.push({ $match: { guestsPhones: phone } });

  const doc = await this.aggregate(pipeline);
  return doc;
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;

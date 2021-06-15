const mongoose = require('mongoose');
const validator = require('validator');

const eventSchema = new mongoose.Schema(
  {
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
    guests: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    imageCover: {
      type: String,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.index({ date: -1 });

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

eventSchema.pre('save', async function (next) {
  await mongoose.model('User').findByIdAndUpdate(this.user, {
    $addToSet: { eventsAsCreator: this._id },
  });
  next();
});

eventSchema.pre('findOneAndUpdate', async function (next) {
  if (!this._update.user) return next();

  const docToUpdate = await this.model.findOne(this.getQuery());

  const userId = this._update.user;
  await mongoose.model('User').findByIdAndUpdate(userId, {
    $addToSet: { eventsAsCreator: docToUpdate._id },
  });
  next();
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;

const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const Event = require('./eventModel');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    trim: true,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please enter a valid email'],
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    required: [true, 'Please provide your phone'],
    validate: [
      validator.isMobilePhone,
      'Please enter a valid mobile phone number',
    ],
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
    select: false,
  },
  eventsAsGuest: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Event',
    },
  ],
  eventsAsCreator: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Event',
    },
  ],
  pictures: [
    {
      type: String,
    },
  ],
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// userSchema.pre('save', async function (next) {
//   if (!this.isModified('eventsAsGuest')) return next();

//   const eventId = this.eventsAsGuest[this.eventsAsGuest.length - 1];
//   await Event.findByIdAndUpdate(eventId, { $addToSet: { guests: this._id } });
//   next();
// });

// userSchema.pre('findOneAndUpdate', async function (next) {
//   if (!this._update.$addToSet.eventsAsGuest) return next();

//   const docToUpdate = await this.model.findOne(this.getQuery());

//   const eventId = this._update.$addToSet.eventsAsGuest;

//   await Event.findByIdAndUpdate(eventId, {
//     $addToSet: { guests: docToUpdate._id },
//   });
//   next();
// });

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.pre(/^find/, async function (next) {
  this.populate({
    path: 'eventsAsGuest',
    select: 'name imageCover',
  }).populate({
    path: 'eventsAsCreator',
    select: 'name imageCover',
  });

  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256', resetToken)
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 1000 * 60 * 15;

  return resetToken;
};

userSchema.statics.addEventsAsGuest = async function (user) {
  const events = await Event.searchGuest(user.phone);
  const eventsIds = events.map((el) => el._id);

  const newUser = await User.findByIdAndUpdate(
    user._id,
    {
      eventsAsGuest: eventsIds,
    },
    { new: true }
  );

  return newUser;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

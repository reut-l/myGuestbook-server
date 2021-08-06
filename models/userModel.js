const mongoose = require('mongoose');
const validator = require('validator');
const crypto = require('crypto');
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

// DOCUMENT MIDDLEWARES
//  1) Encrypting password, and emptying password confirm (after they were compared)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// 2) Updating when password was changed (will be used when reset password token is sent, to check if the token was created before)
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// QUERY MIDDLEWARES
//  1) Filter only active users (users that didn't close their account)
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// 2) Populate attended events and created events' relevant fields
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

// METHODS
// 1) Checks if the password inserted matches the user password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// 2) Checks if the reset password token was created before the password change attempt
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

// 3) Create a password reset token, which will expire in 15 minutes
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256', resetToken)
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 1000 * 60 * 15;

  return resetToken;
};

// 4) Check for events that the user is their guest and add to his attended events
userSchema.methods.addEventsAsGuest = async function () {
  const events = await Event.searchGuest(this.phone);
  const eventsIds = events.map((el) => el._id);

  const doc = await User.findByIdAndUpdate(
    this._id,
    {
      $addToSet: { eventsAsGuest: eventsIds },
    },
    { new: true }
  );

  return doc;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

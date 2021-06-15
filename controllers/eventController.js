const { contentSecurityPolicy } = require('helmet');
const multer = require('multer');
const sharp = require('sharp');
const Event = require('../models/eventModel');
const catchAsync = require('../utils/catchAsync');
const crud = require('./crudController');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image!', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadImageCover = upload.single('imageCover');

exports.resizeImageCover = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.body.imageCover = `event-${req.params.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(1200, 1200)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/eventsCovers/${req.body.imageCover}`);

  next();
});

exports.searchGuestInEvent = catchAsync(async (req, res) => {
  const phone = req.query.phone;
  const eventId = req.params.id;

  let doc = await Event.searchGuest(phone, eventId);

  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: {
      data: doc,
    },
  });
});

exports.getFullEvent = crud.getOne(Event, null, '+guestsPhones');

exports.getAllEvents = crud.getAll(Event);
exports.getEvent = crud.getOne(Event);
exports.createEvent = crud.createOne(Event);
exports.updateEvent = crud.updateOne(Event);
exports.deleteEvent = crud.deleteOne(Event);

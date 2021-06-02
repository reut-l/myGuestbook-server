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

exports.getAllEvents = crud.getAll(Event);
exports.getEvent = crud.getOne(Event, { path: 'owners' });
exports.createEvent = crud.createOne(Event);
exports.updateEvent = crud.updateOne(Event);
exports.deleteEvent = crud.deleteOne(Event);

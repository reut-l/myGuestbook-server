const multer = require('multer');
const sharp = require('sharp');
const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const Event = require('../models/eventModel');
const catchAsync = require('../utils/catchAsync');
const createSmsBody = require('../utils/sms').createSmsBody;
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

// Check if user is in the event guests's phone numbers
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

// Send SMSs to the guests of the event
exports.sendSmsToGuests = catchAsync(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .select('+guestsPhones')
    .populate('user');

  const numbers = event.guestsPhones;
  const bindings = numbers.map((number) => {
    return JSON.stringify({ binding_type: 'sms', address: number });
  });

  const service = client.notify.services(process.env.TWILIO_NOTIFY_SERVICE_SID);

  await service.notifications.create({
    toBinding: bindings,
    body: createSmsBody('eventToGuests', event),
  });

  return res.status(200).json({
    status: 'success',
  });
});

// Get event, including guests phone numbers
exports.getFullEvent = crud.getOne(Event, null, '+guestsPhones');

exports.getAllEvents = crud.getAll(Event);
exports.getEvent = crud.getOne(Event);
exports.createEvent = crud.createOne(Event);
exports.updateEvent = crud.updateOne(Event);
exports.deleteEvent = crud.deleteOne(Event);

const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const Photo = require('../models/photoModel');
const catchAsync = require('../utils/catchAsync');
const crud = require('./crudController');
const AppError = require('../utils/appError');

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

exports.uploadSingleEventPhoto = upload.single('photo');

exports.resizeSingleEventPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  var dir = `public/img/events/${req.params.eventId}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  req.body.name = `${req.params.eventId}/photo-${
    req.params.eventId
  }-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(1200, 1200)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/events/${req.body.name}`);

  next();
});

exports.uploadEventPhotos = upload.array('photos', 100);

exports.resizeEventPhotos = catchAsync(async (req, res, next) => {
  if (!req.files) return next();

  var dir = `public/img/events/${req.params.eventId}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  req.body.photos = [];
  await Promise.all(
    req.files.map(async (file, i) => {
      const filename = `${req.params.eventId}/photo-${
        req.params.eventId
      }-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/events/${filename}`);

      req.body.photos.push(filename);
    })
  );

  next();
});

exports.createPhotos = catchAsync(async (req, res, next) => {
  const insertsArr = req.body.photos.map((el) => {
    return {
      name: el,
      createdAt: req.body.createdAt,
      event: req.params.eventId,
      user: req.user.id,
    };
  });
  const docs = await Photo.insertMany(insertsArr);

  res.status(201).json({
    status: 'success',
    data: {
      data: docs,
    },
  });
});

exports.createPhoto = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This rout is not defined! Please use /photos/eventId instead',
  });
};

exports.getAllPhotos = crud.getAll(Photo);
exports.getPhoto = crud.getOne(Photo, { path: 'owners' });
exports.createSinglePhoto = crud.createOne(Photo);
exports.updatePhoto = crud.updateOne(Photo);
exports.deletePhoto = crud.deleteOne(Photo);

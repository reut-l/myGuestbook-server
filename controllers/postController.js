const multer = require('multer');
const sharp = require('sharp');
const mongoose = require('mongoose');
const Post = require('../models/postModel');
const User = require('../models/userModel');
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

exports.uploadImage = upload.single('screenshot');

exports.resizeImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.body.image = `post-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(1200, 1200)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/posts/${req.body.image}`);

  next();
});

exports.like = (addlike) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Post.findById(req.params.id);

    if (doc.user == req.user.id) {
      return next(
        new AppError('A user cannot mark as liked/unliked his own post', 404)
      );
    }

    if (addlike) {
      doc.likes.addToSet(req.user.id);
      await doc.save();
    } else {
      doc.likes.pull(req.user.id);
      await doc.save();
    }

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

exports.search = catchAsync(async (req, res, next) => {
  const doc = await Post.search(req.query);

  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: {
      data: doc,
    },
  });
});

exports.getAllPosts = crud.getAll(Post);
exports.getPost = crud.getOne(Post);
exports.createPost = crud.createOne(Post);
exports.updatePost = crud.updateOne(Post);
exports.deletePost = crud.deleteOne(Post);

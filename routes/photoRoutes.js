// const express = require('express');
// const photoController = require('../controllers/photoController');
// const authController = require('../controllers/authController');
// const Photo = require('../models/photoModel.js');

// const router = express.Router();

// router
//   .route('/eventId/:eventId/uploadsingle')
//   .post(
//     authController.protect,
//     photoController.uploadSingleEventPhoto,
//     photoController.resizeSingleEventPhoto,
//     photoController.createSinglePhoto
//   );

// router
//   .route('/eventId/:eventId')
//   .post(
//     authController.protect,
//     photoController.uploadEventPhotos,
//     photoController.resizeEventPhotos,
//     photoController.createPhotos
//   );

// router
//   .route('/')
//   .get(photoController.getAllPhotos)
//   .post(photoController.createPhoto);

// router
//   .route('/:id')
//   .get(photoController.getPhoto)
//   .patch(authController.protect, photoController.updatePhoto)
//   .delete(
//     authController.protect,
//     authController.onlyMe(Photo),
//     photoController.deletePhoto
//   );

// module.exports = router;

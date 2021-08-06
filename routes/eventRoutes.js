const express = require('express');
const eventController = require('../controllers/eventController');
const authController = require('../controllers/authController');
const Event = require('../models/eventModel');

const router = express.Router();

router.get(
  '/:id/sendSmsToGuests',
  authController.protect,
  authController.onlyMe(Event),
  eventController.sendSmsToGuests
);

router.patch(
  '/:id/uploadCover',
  authController.protect,
  authController.onlyMe(Event),
  eventController.uploadImageCover,
  eventController.resizeImageCover,
  eventController.updateEvent
);

router.get('/:id/searchGuest', eventController.searchGuestInEvent);

router.get(
  '/:id/myEvent',
  authController.protect,
  authController.onlyMe(Event),
  eventController.getFullEvent
);

router
  .route('/')
  .get(eventController.getAllEvents)
  .post(authController.protect, eventController.createEvent);

router
  .route('/:id')
  .get(eventController.getEvent)
  .patch(
    authController.protect,
    authController.onlyMe(Event),
    eventController.updateEvent
  )
  .delete(
    authController.protect,
    authController.onlyMe(Event),
    eventController.deleteEvent
  );

module.exports = router;

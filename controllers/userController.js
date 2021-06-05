const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const crud = require('./crudController');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }
  const filteredBody = filterObj(req.body, 'name', 'email', 'phone');

  let updatedUser;

  if (Object.keys(filteredBody).length > 0) {
    updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidator: true,
    });
  }

  const arrFields = ['eventsAsGuest', 'eventsAsCreator'];

  for (i = 0; i < arrFields.length; i++) {
    if (req.body[arrFields[i]]) {
      const field = arrFields[i];
      const input = req.body[field];
      updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
          $addToSet: { [field]: input },
        },
        { new: true }
      );
    }
  }

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

exports.deleteMe = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This rout is not defined! Please use /signup instead',
  });
};

// exports.checkIfNewEventsAsGuest = catchAsync(async (req, res, next) => {
//   const { eventsAsGuest, phone, _id } = req.user;
//   const events = await Event.searchGuest(phone);
//   const updatedEventsAsGuest = events.map((el) => el._id);

//   const newEventsAsGuest = updatedEventsAsGuest.filter(
//     (el) => !eventsAsGuest.includes(el)
//   );

//   if (newEventsAsGuest) {
//     const user = await User.findByIdAndUpdate(_id, {
//       eventsAsGuest: updatedEventsAsGuest,
//     });

//     return res.status(200).json({
//       status: 'success',
//       data: {
//         user,
//       },
//     });
//   }

//   res.status(200).json({
//     status: 'success',
//     data: null,
//   });
// });

exports.getUser = crud.getOne(User);
exports.getAllUsers = crud.getAll(User);
exports.updateUser = crud.updateOne(User);
exports.deleteUser = crud.deleteOne(User);

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// CRUD general functions for ths Models

// Helper functions
const removeDuplicatesInArr = (obj) => {
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      obj[key] = [...new Set(value)];
    }
  });

  return obj;
};

const filterObj = (obj, notAllowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (!notAllowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // 1) Remove duplicated from array fields
    req.body = removeDuplicatesInArr(req.body);

    const fields = Object.keys(req.body);

    // 2) Select all the array fields in a Model
    let arrFields = [];
    if (fields.length > 0) {
      for (i = 0; i < fields.length; i++) {
        const field = fields[i];
        const fieldType = Model.schema.paths[field].instance;
        if (fieldType === 'Array') arrFields.push(field);
      }
    }

    // 3) Remove the array fields
    const filteredBody = filterObj(req.body, arrFields);

    // 4) Find and Update the doc with non-array fields
    let doc;
    if (Object.keys(filteredBody).length > 0) {
      doc = await Model.findByIdAndUpdate(req.params.id, filteredBody, {
        new: true,
        runValidators: true,
      });
    }

    // 5) Find and Update the doc with the array fields, adding only new elements fron the array
    if (arrFields.length > 0) {
      for (i = 0; i < arrFields.length; i++) {
        const field = arrFields[i];
        const input = req.body[field];
        doc = await Model.findByIdAndUpdate(
          req.params.id,
          {
            $addToSet: { [field]: input },
          },
          { new: true }
        );
      }
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

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    req.body = removeDuplicatesInArr(req.body);

    if (req.params.eventId) req.body.event = req.params.eventId;

    let doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions, selectOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (selectOptions) query = query.select(selectOptions);
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

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

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // Filtering and sorting according to the request
    const features = new APIFeatures(Model.find({}), req.query).filter().sort();
    const doc = await features.query;

    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });

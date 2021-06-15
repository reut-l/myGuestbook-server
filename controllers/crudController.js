const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

const removeDuplicatesInArr = (obj) => {
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      obj[key] = [...new Set(value)];
    }
  });

  return obj;
};

const selectFieldsWithArray = (obj) => {
  const arrKeys = Object.keys(
    Object.fromEntries(
      Object.entries(obj).filter(
        ([key, value]) => typeof value === 'object' && value !== null
      )
    )
  );

  return arrKeys;
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
    req.body = removeDuplicatesInArr(req.body);

    const fields = Object.keys(req.body);

    let arrFields = [];
    if (fields.length > 0) {
      for (i = 0; i < fields.length; i++) {
        const field = fields[i];
        const fieldType = Model.schema.paths[field].instance;
        if (fieldType === 'Array') arrFields.push(field);
      }
    }

    const filteredBody = filterObj(req.body, arrFields);

    let doc;
    if (Object.keys(filteredBody).length > 0) {
      doc = await Model.findByIdAndUpdate(req.params.id, filteredBody, {
        new: true,
        runValidators: true,
      });
    }

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
    const arrFields = selectFieldsWithArray(req.body);
    const filteredBody = filterObj(req.body, arrFields);

    if (req.params.eventId) filteredBody.event = req.params.eventId;

    let doc = await Model.create(filteredBody);

    if (arrFields.length > 0) {
      for (i = 0; i < arrFields.length; i++) {
        const field = arrFields[i];
        const input = req.body[field];
        doc = await Model.findByIdAndUpdate(
          doc._id,
          {
            [field]: input,
          },
          { new: true, runValidators: true }
        );
      }
    }

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

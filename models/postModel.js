const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    image: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A post must belong to a user.'],
    },
    event: {
      type: mongoose.Schema.ObjectId,
      ref: 'Event',
      required: [true, 'A post must belong to an event.'],
    },
    likes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
postSchema.index({ event: 1 });

postSchema.virtual('numberOfLikes').get(function () {
  return this.likes.length;
});

postSchema.statics.search = async function (queryStr) {
  let pipeline = [];
  let events = [];

  if (queryStr.user || queryStr.likes) {
    events = await findUserEvents(queryStr);
  } else if (queryStr.event) {
    events.push(queryStr.event);
  }
  events = events.map((el) => mongoose.Types.ObjectId(el));

  pipeline.push({
    $match: {
      event: { $in: events },
    },
  });

  const userFilter = createFilter('user', queryStr);
  const likesFilter = createFilter('likes', queryStr);

  if (userFilter !== null) {
    pipeline.push({ $match: userFilter });
  }

  if (likesFilter !== null) {
    pipeline.push({ $match: likesFilter });
  }

  const searchValue = queryStr.term;

  const regex =
    !searchValue || searchValue === null || searchValue === ''
      ? /(.*?)/
      : new RegExp(searchValue, 'i');

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $match: {
        $or: [
          { 'user.name': { $regex: regex } },
          { 'user.phone': { $regex: regex } },
          { 'user.email': { $regex: regex } },
        ],
      },
    },
    {
      $project: {
        user: {
          role: 0,
          eventsAsGuest: 0,
          eventsAsCreator: 0,
          active: 0,
          password: 0,
        },
      },
    }
  );

  let doc = await this.aggregate(pipeline);
  doc = doc.map((el) => {
    el.user = el.user[0];
    return el;
  });

  return doc;
};

const findUserEvents = async (query) => {
  const user = query.user ? query.user : query.likes;

  const userEvents = await mongoose
    .model('User')
    .find({ _id: user })
    .select('-_id eventsAsGuest eventsAsCreator');

  const [{ eventsAsGuest, eventsAsCreator }] = userEvents;
  const events = [];
  eventsAsGuest.map((el) => events.push(el._id));
  eventsAsCreator.map((el) => events.push(el._id));
  return events;
};

createFilter = (filter, query) => {
  if (!query[filter] || query[filter] === null || query[filter] === '')
    return null;
  let filterId = query[filter];
  filterId = mongoose.Types.ObjectId(filterId);
  const filterObj = { [filter]: filterId };
  return filterObj;
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post;

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
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
});

postSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.id;
  },
});

postSchema.index({ event: 1 });

// VIRTUAL POPULATE
postSchema.virtual('numberOfLikes').get(function () {
  return this.likes.length;
});

// STATIC FUNCTIONS
// 1) Search posts
postSchema.statics.search = async function (queryStr) {
  let pipeline = [];
  let events = [];

  // a. Search posts that user created / user liked / of an event
  // First, filter only the relevant events (that user created or attended or simply the event that is queried if the search is for posts of an event)
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

  // Then, create the filters: user who created posts/ user who liked posts, and push them to the pipeline
  const userFilter = createFilter('user', queryStr);
  const likesFilter = createFilter('likes', queryStr);

  if (userFilter !== null) {
    pipeline.push({ $match: userFilter });
  }

  if (likesFilter !== null) {
    pipeline.push({ $match: likesFilter });
  }

  // b. Search whithin the filtered posts, posts that created by user (by full or partial name /phone/ email) or search all in case there is no term or it's not relevant.
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
    }
  );

  let docs = await this.aggregate(pipeline);
  docs = docs.map((doc) => {
    doc.user = doc.user[0]._id;
    doc.numberOfLikes = doc.likes.length;
    return doc;
  });

  return docs;
};

// helper functions
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

const fs = require('fs');
const path = require('path');
// BE MY GUEST in my online guestbook of %EVENT_NAME%.
// %EVENT_LINK%
// See you there,
// %EVENT_CREATER%

const replaceAll = (str, mapObj) => {
  const re = new RegExp(Object.keys(mapObj).join('|'), 'gi');

  return str.replace(re, (matched) => {
    return mapObj[matched];
  });
};

exports.createSmsBody = (smsName, doc) => {
  const tempSms = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'sms', `${smsName}Template.txt`),
    'utf-8'
  );

  let replacesObj;

  if (smsName === 'eventToGuests') {
    replacesObj = {
      EVENT_NAME: doc.name,
      EVENT_LINK: `${process.env.CLIENT_URL}/events/${doc._id}`,
      EVENT_CREATOR: doc.user.name,
    };
  }

  const output = replaceAll(tempSms, replacesObj);
  return output;
};

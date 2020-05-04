var mongoose = require('mongoose');

var message = mongoose.Schema ({
    userName: String,
    text: String,
    time: String
});

var texts = mongoose.model('Messages', message);
module.exports = texts;
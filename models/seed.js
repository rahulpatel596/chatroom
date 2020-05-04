var md5 = require('md5');
var seed = function(Users) {
    Users.find(function(err, users) {
        if (users.length) return null;
        new Users({
            uname: 'admin',
            pass: md5('admin'),
            message: '',
            rw: 'rw',
            type: 'Admin'
        }).save();
    });
};

module.exports = {
    seed: seed
};
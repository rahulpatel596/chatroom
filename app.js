const express = require('express'),
    handlebars = require('express-handlebars').create({defaultLayout: 'main'}),
    path = require('path'),
    sessions = require('express-session'),
    md5 = require('md5'),
    cookieParser = require('cookie-parser'),
    mongoose = require('mongoose'),
    credentials = require('./credentials'),
    Users = require('./models/uCredentials.js'),
    process = require('process');
    texts = require('./models/messageSchema.js');
var app = express();

app.set('port', 3013);
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.use(express.static(path.resolve(__dirname + '/public')));
app.use(require('body-parser').urlencoded({extended: false}));
app.use(cookieParser(credentials.cookieSecret));

var connectionString = 'mongodb://' +
    credentials.mongo.development.hosts + '/' +
    credentials.mongo.development.database +
    credentials.mongo.development.options;
mongoose.connect(connectionString, { useNewUrlParser: true });

Users.find(function (err, users) {
    if (users.length) return null;
    new Users({
        uname: 'admin',
        pass: md5('admin'),
        message: '',
        rw: 'rw',
        type: 'Admin'
    }).save();
});

app.use(sessions({
    resave: true,
    saveUninitialized: false,
    secret: credentials.cookieSecret,
    cookie: {maxAge: 3600000}
}));

function checklogin(req, res, user, password) {
    Users.findOne({uname: user}, function (err, user) {
        if (err) {
            res.render('login', {message: 'Error accessing database. Try again'});

        } else if (user.pass === md5(password)) {
            req.session.userName = req.body.uname;
            req.session.type = user.type;
            req.session.rw = user.rw;
            res.redirect(303, 'home');
        } else {
            res.render('login', {message: 'Username or password was not valid. Try again'});
        }
    });
}

app.get('', function (req, res) {
    if (req.session.userName) {
        res.redirect('home');
    } else {
        res.render('login');
    }
});

app.post('/processReg', function (req, res) {
    if (req.body.pword.trim() === req.body.pword2.trim()) {
        var newUser = Users({
            uname: req.body.email,
            pass: md5(req.body.pword),
            type: req.body.Type,
            rw: 'rw'
        });
        newUser.save(function (error) {
            if (error)
                console.log("Error adding new user : " + error);
        });
        res.redirect(303, 'manage');
    } else
        res.render('register', {message: 'Password did not match, try again!'});
});

app.post('/process', function (req, res) {
    if (req.body.buttonVar === 'login') {
        checklogin(req, res, req.body.uname.trim(), req.body.pword.trim());
    }
    else
        res.redirect(303, 'register');
});

app.get('/home', function (req, res) {
    if (req.session.userName && req.session.type === "Admin" && req.session.rw === 'rw')
        res.render('home', {admins: true});
    else if (req.session.userName && req.session.type === "Admin" && req.session.rw === 'r')
        res.render('home', {admins: true, pro: "disabled"});
    else if (req.session.userName && req.session.rw === 'r')
        res.render('home', {pro: "disabled"});
    else if (req.session.userName && req.session.rw === 'rw')
        res.render('home');
    else
        res.render('401', {message: 'You must login to access the home page'})
});

app.post('/home', function (req, res) {
    var newMessage = texts({
        userName: req.session.userName,
        text: req.body.message,
        time: req.body.time,
        _id: req.body._id
    });
    newMessage.save(function (error) {
        if (error)
            console.log("Error adding new message : " + error);
    });
    res.send(JSON.stringify(newMessage));
});

app.get('/data', function (req, res) {
    texts.find(function (err, messages) {
        if (err) next(err);
        if (req.session.userName) {
            res.send(JSON.stringify(messages));
        }
        else res.render('401', {message: 'You must login to access the home page'})
    });
});

app.get('/my', function (req, res) {
    texts.find({userName: req.session.userName}, function (error, obj) {
        if (error) next(error);
        if (req.session.userName) {
            res.send(JSON.stringify(obj));
        }
        else res.render('401', {message: 'You must login to access the my chats page'})
    });
});

app.get('/mychats', function (req, res) {
    if (req.session.userName) {
        res.render('mychats');
    }
    else
        res.render('401', {message: 'You must login to access the my chats page'})
});

app.post('/mychats', function (req, res) {
    if (req.session.userName) {
        texts.deleteOne({_id: req.body.id}, function (error) {
            if (error) next(error);
            res.send({success: "true"});
        })
    }
    else res.render('401', {message: 'You must login to access the my chats page'})
});

app.get('/personal', function (req, res) {
    Users.find(function (error, obj) {
        if (error) next(error);
        if (req.session.userName) {
            res.send(JSON.stringify(obj));
        }
        else res.render('401', {message: 'You must login to access the Personal chats page'})
    });
});

app.get('/manage', function (req, res) {
    if (req.session.userName) {
        res.render('manage');
    }
    else
        res.render('401', {message: 'You must login to access the Manage Users page'})
});

app.post('/manage', function (req, res) {
    if (req.session.userName) {
        Users.deleteOne({uname: req.body.user}, function (error) {
            if (error) next(error);
            res.send({success: "true"});
        })
    }
    else res.render('401', {message: 'You must login to access the my chats page'})
});

app.post('/change', function (req, res) {
    if (req.session.userName) {
        Users.findOneAndUpdate({uname: req.body.user}, {rw: req.body.pro}, function (error, user) {
            if (error) next(error);
            res.send(JSON.stringify({success:true}));
        });
    }
    else res.render('401', {message: 'You must login to access the my chats page'})
});

app.get('/settings', function (req, res) {
    if (req.session.userName) {
        var value = 'unchecked';
        if (req.signedCookies.oldNew === '1')
            value = 'checked';
        if (req.session.type === "Admin")
            res.render('settings', {bool: value, admins: true});
        else
            res.render('settings', {bool: value})
    }
    else
        res.render('401', {message: 'You must login to access the home page'})
});

app.post('/settings', function (req, res) {
    if (req.session.userName) {
        res.cookie('oldNew', req.body.number, {signed: true, maxAge: 24 * 60 * 60 * 7 * 1000});
        res.cookie('bg', req.body.image, {signed: true, maxAge: 24 * 60 * 60 * 7 * 1000});
        res.send(JSON.stringify(req.body));
    }
    else
        res.render('401', {message: 'You must login to access the settings page'})
});

app.get('/register', function (req, res) {
    if (req.session.userName === 'admin')
        res.render('register');
});

app.get('/logout', function (req, res) {
    delete req.session.userName;
    res.redirect(303, '/');
});

app.use(function (req, res) {
   res.status(401);
   res.render('401');
});

app.use(function (error, req, res) {
    console.log(error.stack);
    res.status(500);
    res.render('500');
});

app.listen(3013, function () {
    console.log("The server is up and running at port 3013!, press CTRL + C to continue");
});

process.on('unhandledRejection', function (error) {
    // Will print "unhandledRejection err is not defined"
    console.log('unhandledRejection', error.message);
});
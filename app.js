process.chdir(__dirname);
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var fs = require("fs");
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var MongoStore = require('connect-mongo')(session);

var app = express();
app.use(favicon('./public/img/mesh.ico'));
app.set('views', './views');
app.set('view engine', 'jade');
app.use(logger('dev', {
    skip: function(req, res) {
        var omit = req.originalUrl.indexOf(/(KEY_)|(opml)|(password)|(admin)/) != -1;
        if (omit) console.log('- Omitted -');
        return omit;
    }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

var monk = require('monk');
var db = monk(process.env.DB_URL);

mongoose.connect(process.env.DB_URL);
app.use(session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true,
    cookie: {
        maxAge: 2592e6 //1 Month
    },
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    })
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
require('./user/auth')(passport);
GLOBAL.db = db;
fs.readdirSync('./routes').forEach(function(route) {
    app.use(require('./routes/' + route.slice(0, -3)));
});

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

/*
process.on('uncaughtException', function(err) {
    if (err.code == 'ECONNRESET') {
        //See https://github.com/fent/node-ytdl-core/issues/65
        console.log('Got an ECONNRESET!');
        console.log(err.stack);
    } else {
        console.log(err);
        console.log(err.stack);
        process.exit(0);
    }
});
*/

console.log("READY!");

module.exports = app;

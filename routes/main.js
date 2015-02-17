var express = require('express');
var router = express.Router();

router.get('/',     function(req, res) { res.redirect('/home');        });
router.get('/join', function(req, res) { res.redirect('/user/signup'); });

router.get('/home', require('../user/isAuthenticated'), function(req, res) {
    if (!req.user.bootstrapped) return res.redirect('/firstStation');
    res.render('main', {
        title: 'Radio'
    });
});

module.exports = router;

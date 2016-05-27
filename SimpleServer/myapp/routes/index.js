'use strict';
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let urlencodedParser = bodyParser.urlencoded({ extended: false });
let htmlParser = require('./../htmlParser.js');

/* GET home page. */
router.get('/', function (req, res) {
    res.sendFile( __dirname + "/" + "index.html" );
});

router.post('/process_post', urlencodedParser, function (req, res) {
    let link = req.body.url_field;
    if(link !== undefined) {
        htmlParser(link);
    }
    let response = {
       url:req.body.url_field,
    };
    console.log(response);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
})

module.exports = router;

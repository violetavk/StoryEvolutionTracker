'use strict';
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let urlencodedParser = bodyParser.urlencoded({ extended: false });
let htmlParser = require("./../htmlParser.js");
let textProcessor = require("./../textProcessing.js");

let recentLinks = [];
/* GET home page. */
router.get('/', function (req, res) {
    res.sendFile( __dirname + "/" + "index.html" );
});

router.post('/process_post', urlencodedParser, function (req, res) {
    let link = req.body.url_field.trim();
    if(link !== undefined) {
        htmlParser(link, function(pageObject) {
            // add link to recent links for web UI
            if(recentLinks.indexOf(link) < 0) {
                recentLinks.push(link);
            }

            let textObject = textProcessor(pageObject);

            // construct the response
            let response = {
               url: req.body.url_field,
               pageObject: pageObject,
               recentLinks: recentLinks,
               textObject: textObject
            };
            console.log(response);

            // send the response
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(response));
        });
        
    }
    else
        console.log("Error, link was undefined");
    
})

module.exports = router;

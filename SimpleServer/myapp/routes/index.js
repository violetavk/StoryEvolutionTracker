'use strict';
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let urlencodedParser = bodyParser.urlencoded({extended: false});

let parseHtml = require("./../htmlParser.js").parseHTML;
let processText = require("./../textProcessing.js").processText;
let generateSignatures = require("./../signatureGeneration").generateSignatures;
let crawlWeb = require("./../webCrawling").crawler;

let recentLinks = [];
/* GET home page. */
router.get('/signatures', function (req, res) {
    res.sendFile(__dirname + "/" + "signatures.html");
});

router.post('/process_post', urlencodedParser, function (req, res) {
    let link = req.body.url_field.trim();
    if (link !== undefined) {
        let responses = [res,link];

        if (recentLinks.indexOf(link) < 0) {
            recentLinks.push(link);
        }

        // using Promises to process pages
        parseHtml(responses)
            .then(processText)
            .then(generateSignatures)
            .then(sendResponseSignatures);
    }
    else
        console.log("Error, link was undefined");
});

router.get('/crawler',function(req, res) {
   res.sendFile(__dirname + "/" + "crawler.html");
});

router.post('/process_crawl',urlencodedParser, function (req, res) {
    let link = req.body.url_field.trim();
    if (link !== undefined) {
        let responses = [res,link];
        if (recentLinks.indexOf(link) < 0) {
            recentLinks.push(link);
        }

        parseHtml(responses)
            .then(processText)
            .then(generateSignatures)
            .then(crawlWeb)
            .then(sendResponseCrawler);

        // sendResponseCrawler(responses);
    }
    else
        console.log("Error, link was undefined");
});

function sendResponseSignatures(objects) {
    let response = {
        recentLinks:    recentLinks,
        url:            objects[1],
        pageObject:     objects[2],
        textObject:     objects[3],
        signatures:     objects[4]
    };

    let res = objects[0];
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
}

function sendResponseCrawler(objects) {
    let response = {
        recentLinks:    recentLinks,
        url:            objects[1],
        pageObject:     objects[2],
        textObject:     objects[3],
        signatures:     objects[4],
        crawled:        objects[5]
    };
    let res = objects[0];
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
}

module.exports = router;

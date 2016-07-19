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
        let objects = {
            response: res,
            link: link
        };

        if (recentLinks.indexOf(link) < 0) {
            recentLinks.push(link);
        }

        // using Promises to process pages
        parseHtml(objects)
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
        let objects = {
            response: res,
            link: link
        };

        if (recentLinks.indexOf(link) < 0) {
            recentLinks.push(link);
        }

        parseHtml(objects)
            .then(processText)
            .then(generateSignatures)
            .then(crawlWeb)
            .then(sendResponseCrawler);

    }
    else
        console.log("Error, link was undefined");
});

function sendResponseSignatures(objects) {
    let response = {
        recentLinks:    recentLinks,
        url:            objects.link,
        pageObject:     objects.pageObject,
        textObject:     objects.textObject,
        signatures:     objects.signatures
    };

    let res = objects.response;
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
}

function sendResponseCrawler(objects) {
    let response = {
        recentLinks:    recentLinks,
        url:            objects.link,
        pageObject:     objects.pageObject,
        textObject:     objects.textObject,
        signatures:     objects.signatures,
        crawled:        objects.crawled
    };
    let res = objects.response;
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
}

module.exports = router;

'use strict';
let express = require('express');
let router = express.Router();
// let bodyParser = require('body-parser');
// let urlencodedParser = bodyParser.urlencoded({extended: false});

let storyevolutiontracker = require("./../storyevolutiontracker");

let recentLinks = [];
/* GET home page. */
router.get('/signatures', function (req, res) {
    res.sendFile(__dirname + "/" + "signatures.html");
});

router.post('/process_post', function (req, res) {
    let link = req.body.url_field.trim();
    if (link !== undefined) {
        if (recentLinks.indexOf(link) < 0) {
            recentLinks.push(link);
        }
        storyevolutiontracker.parseAndGenerateSignature(link,function(objects) {
            console.log(objects);
            sendResponseSignatures(res,objects);
        });
    }
    else
        console.log("Error, link was undefined");
});

router.get('/crawler',function(req, res) {
   res.sendFile(__dirname + "/" + "crawler.html");
});

router.post('/process_crawl', function (req, res) {
    let link = req.body.url_field.trim();
    if (link !== undefined) {
        if (recentLinks.indexOf(link) < 0) {
            recentLinks.push(link);
        }
        storyevolutiontracker.processThenCrawl(link,function(objects) {
            sendResponseCrawler(res,objects);
        });
    }
    else
        console.log("Error, link was undefined");
});

router.post("/get_next_article", function(req,res) {
    // let words = ["church","priest","france","attack","soldiers","police","rouen","suburb"];
    let words = req.body.words;
    storyevolutiontracker.findNextArticle(words,function(obj) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(obj));
    });
});

router.get("/userSim", function(req,res) {
    res.sendFile(__dirname + "/" + "userSim.html");
});

function sendResponseSignatures(res,objects) {
    let response = {};
    if(process.env.NODE_ENV === "development") {
        response = {
            recentLinks: recentLinks,
            url: objects.link,
            pageObject: objects.pageObject,
            textObject: objects.textObject,
            signatures: objects.signatures
        };
    } else if(process.env.NODE_ENV === "production") {
        response = {
            recentLinks: recentLinks,
            url: objects.link,
            pageObject: {
                date: objects.pageObject.date,
                headline: objects.pageObject.headline,
                section: objects.pageObject.section
            },
            textObject: {
                topicWords: objects.textObject.topicWords
            },
            signatures: {
                signature: objects.signatures.plainSignature
            }
        }
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
}

function sendResponseCrawler(res,objects) {
    let response = {
        recentLinks:    recentLinks,
        url:            objects.link,
        pageObject:     objects.pageObject,
        textObject:     objects.textObject,
        signatures:     objects.signatures,
        crawled:        objects.crawled
    };
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
}

module.exports = router;

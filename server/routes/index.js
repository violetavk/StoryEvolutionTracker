'use strict';
let express = require('express');
let router = express.Router();
let storyevolutiontracker = require("./../storyevolutiontracker");
let recentLinks = [];

router.get('/signatures', function (req, res) {
    res.sendFile(__dirname + "/" + "signatures.html");
});

router.get('/crawler',function(req, res) {
   res.sendFile(__dirname + "/" + "crawler.html");
});

router.post('/process_post', function (req, res) {
    let link = req.body.url_field.trim();
    if (link !== undefined) {
        if (recentLinks.indexOf(link) < 0) {
            recentLinks.push(link);
        }
        storyevolutiontracker.parseAndGenerateSignature(link,function(objects) {
            console.log(objects);
            console.log("----------------------------------------------------");
            sendResponseSignatures(res,objects);
        });
    }
    else
        console.log("Error, link was undefined");
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
    let timestamp = req.body.timestamp;
    let words = req.body.words;
    storyevolutiontracker.findNextArticle(words,timestamp,function(obj) {
        let next = obj.chosenOne;
        let response = {};
        if(!next) {
            response = {
                found: false,
                msg: "There was no newer article to select"
            };
        } 
        else {
            response = {
            found: true,
            link: next.pageObject.link,
            headline: next.pageObject.headline,
            timestamp: next.pageObject.date,
            section: next.pageObject.section,
            topicWords: next.textObject.topicWords,
            signature: next.signatures.plainSignature,
            modifiedTopicWords: obj.modifiedTopicWords
            };
        }
        console.log("Done with web crawling");
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(response));
    });
});

function sendResponseSignatures(res,objects) {
    let response  = {
        recentLinks: recentLinks,
        url: objects.link,
        pageObject: objects.pageObject,
        textObject: objects.textObject,
        signatures: objects.signatures
    };
    console.log("Done with sending signature response");
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
    console.log("Done with sending crawler response");
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
}

module.exports = router;
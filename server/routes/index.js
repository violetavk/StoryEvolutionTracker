'use strict';
let express = require('express');
let router = express.Router();
let storyevolutiontracker = require("./../storyevolutiontracker");
let recentLinks = [];

/* START - gets pages for webapp only */
router.get('/signatures', function (req, res) {
    res.sendFile(__dirname + "/" + "signatures.html");
});

router.get('/crawler',function(req, res) {
   res.sendFile(__dirname + "/" + "crawler.html");
});
/* END - gets pages for webapp only */

/* Route that is called to process a single article */
router.post('/process_article', function (req, res) {
    let link = req.body.url_field.trim();
    let prod = req.body.prod;
    let startTime = Date.now();
    console.log("[START] process_article",link,"--",new Date(startTime));
    if (link !== undefined) {
        if (recentLinks.indexOf(link) < 0) {
            recentLinks.push(link);
        }
        storyevolutiontracker.parseAndGenerateSignature(link,function(objects) {
            let endTime = Date.now();
            console.log("[FINISH -",(endTime-startTime),"millis] process_article",link,"--",new Date(endTime));
            sendResponseSignatures(res,objects,prod);
        });
    }
    else
        console.log("Error, link was undefined");
});

/* FOR LOCAL CRAWLING ONLY - DEVELOPMENT ONLY */
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

/* Route for getting an update for a story */
router.post("/get_next_article", function(req,res) {
    let timestamp = req.body.timestamp;
    let words = req.body.words;
    let category = req.body.category;
    let startTime = Date.now();
    console.log("[START] get_next_article --",new Date(startTime));
    console.log("  Recieved words:",words);
    console.log("  Recieved timestamp:",timestamp);
    console.log("  Recieved category:",category);
    storyevolutiontracker.findNextArticle(words,timestamp,category,function(obj) {
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
            date: next.pageObject.date,
            section: next.pageObject.section,
            topicWords: next.textObject.topicWords,
            signature: next.signatures.plainSignature,
            // modifiedTopicWords: obj.modifiedTopicWords
            };
        }
        let endTime = Date.now();
        console.log("[FINISH -",(endTime-startTime),"millis] get_next_article --",new Date(endTime));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.send(JSON.stringify(response));
    });
});

/* Sends a response after completion of signature generation; different responses for dev and prod */
function sendResponseSignatures(res,objects,prod) {
    let response = {};
    if(objects.error) {
        response = {
            success: false,
            reason: objects.error
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(response));
    }

    if(prod) {
        response = {
            success: true,
            link: objects.link,
            date: objects.pageObject.date,
            section: objects.pageObject.section,
            headline: objects.pageObject.headline,
            category: objects.pageObject.category,
            topicWords: objects.textObject.topicWords,
            topicWordsFreq: objects.textObject.topicWordsFreq,
            signature: objects.signatures.plainSignature
        };
    } else {
        response  = {
            recentLinks: recentLinks,
            url: objects.link,
            pageObject: objects.pageObject,
            textObject: objects.textObject,
            signatures: objects.signatures
        };
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
}

/* Sends a dev response for local crawler */
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

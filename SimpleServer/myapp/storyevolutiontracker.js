'use strict';
let parseHtml = require("./htmlParser").parseHTML;
let processText = require("./textProcessing.js").processText;
let generateSignatures = require("./signatureGeneration").generateSignatures;
let crawlLocal = require("./webCrawling").crawler;
let crawlWeb = require("./webCrawling").webCrawler;

exports.parseAndGenerateSignature = function(link,cb) {
    let objects = {
        link: link
    };

    // using Promises to process pages
    parseHtml(objects)
        .then(processText)
        .then(generateSignatures)
        .then(cb);
};

exports.processThenCrawl = function(link,cb) {
    let objects = {
        link: link
    };

    parseHtml(objects)
        .then(processText)
        .then(generateSignatures)
        .then(crawlLocal)
        .then(cb);  
};

exports.findNextArticle = function(words,cb) {
    crawlWeb(words)
        .then(cb);
};

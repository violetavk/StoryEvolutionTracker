'use strict';
let parseHtml = require("./htmlParser").parseHTML;
let processText = require("./textProcessing.js").processText;
let generateSignatures = require("./signatureGeneration").generateSignatures;
let crawlWeb = require("./webCrawling").crawler;

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
        .then(crawlWeb)
        .then(cb);  
};

exports.findNextArticle = function(article,cb) {
    crawlWeb(article)
        .then(cb);
};

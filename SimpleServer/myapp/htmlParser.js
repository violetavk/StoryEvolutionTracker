#!/usr/bin/env node
"use strict";

let http = require("http");
let url = require("url");
let bl = require("bl");
let cheerio = require("cheerio");
let natural = require("natural");

let htmlParser = function(toParse, callback) {
    console.log("---Beginning Parsing---");
    let bufferlist = bl();

    let link = url.parse(toParse);

    let pageObject;

    let options = {
        host: link.host,
        port: 80,
        path: link.path
    };

    http.get(options, function(response) {

        response.on("data", function(data) {
            bufferlist.append(data);
        });
        response.on("end", function(data) {
            pageObject = parse(bufferlist);
            callback(pageObject);
        })
        response.on("error", function(err) {
            console.error(err);
        })
    });

};

function parse(buffer) {
    let pageData = buffer.toString();
    
    let pageObject = getBasics(pageData);
    pageObject.sentences = getSentences(pageObject);
    pageObject.article = concatSentences(pageObject);
    // pageObject.frequencies = getWordFrequencies(pageObject);

    return pageObject;
}

function getBasics(pageData) {
    let $ = cheerio.load(pageData); // parse into DOM

    let pageObject = { };

    // BBC
    pageObject.date = parseInt($(".date").attr("data-seconds"));
    pageObject.formattedDate = $(".date").attr("data-datetime");
    pageObject.headline = $(".story-body__h1").text();
    pageObject.bolded = $(".story-body__introduction").text();
    let paragraphs = [];
    $(".story-body__inner").find("p").each(function(i, element) {
        if(i == 0) {
            let currText = $(this).text();
            if(currText !== pageObject.bolded) {
                paragraphs.push(currText);
            }
        }
        else
            paragraphs.push($(this).text());
    });
    pageObject.paragraphs = paragraphs;

    return pageObject;
}

function getSentences(pageObject) {
    let sentenceTokenizer = new natural.SentenceTokenizer();
    let sentences = [];
    for(let par of pageObject.paragraphs) {
        // if a paragraph does not have a period, do not include
        if(par.indexOf(".") < 0) {
            console.log("Skipping this one");
            continue; 
        }
        // tokenize paragraph into individual sentences
        let currSent = sentenceTokenizer.tokenize(par);
        for(let s of currSent) {
            if(s.includes("\"")) {
                let numQuotes = s.match(/"/g).length;
                if(numQuotes % 2 === 0) 
                    sentences.push(s);
            }
            else
                sentences.push(s);
        }
    }

    return sentences;
}

function concatSentences(pageObject) {
    let doc = "";
    if(pageObject.bolded != null) {
        doc += (pageObject.bolded + " ");
    }
    for(let s of pageObject.sentences) {
        doc += (s + " ");
    }
    return doc;
}

module.exports = htmlParser;
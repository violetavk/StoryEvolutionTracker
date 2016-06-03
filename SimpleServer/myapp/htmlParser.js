#!/usr/bin/env node
"use strict";

let http = require("http");
let url = require("url");
let bl = require("bl");
let cheerio = require("cheerio");
let natural = require("natural");

let htmlParser = function(toParse, callback) {
    console.log("-- HTML Parsing --");
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

    sentences = fixNames(sentences);
    sentences = fixImproperSplits(sentences);

    return sentences;
}

function fixNames(sentences) {
    let titles = ["Mr", "Mrs", "Ms", "Miss", "Mx", "Dr", "Prof"];

    // process sentences to make sure that names like "Mr. Name" are not tokenized into separate sentences
    for(let i = 0; i < sentences.length; i++) {
        let curr = sentences[i];

        // case 1: sentence contains a title, like Mr.
        for(let title of titles) {
            let index = curr.indexOf(title);
            if(index > -1) {
                // there is a name title in this sentence
                let toVerify = index + title.length;
                if(toVerify <= curr.length) {
                    if(curr.charAt(toVerify) === "." && toVerify === (curr.length-1) && (i+1) < sentences.length) {
                        // merge this sentence and the next to put the name back together
                        curr = curr.concat(" ", sentences[i+1]);
                        sentences[i] = curr;
                        sentences.splice(i+1,1);
                        i--;
                    }
                }
            }
        }
    }
    return sentences; 
}

function fixImproperSplits(sentences) {
    // if a sentence was tokenized incorrectly, like on a url, the next sentence begins with a lowercase letter
    for(let i = 0; i < sentences.length; i++) {
        let curr = sentences[i];
        let firstChar = curr[0];
        let isLowerCase = /^[a-z0-9]+$/.test(curr[0]);
        if(isLowerCase && i-1 >= 0) {
            // the first letter of the sentence is lowercase, so it must be merged with previous sentence
            let prevIndex = i - 1;
            let prevSentence = sentences[prevIndex];
            let newSentence = "";
            if(prevSentence.charAt(prevSentence.length-1) === ".")
                newSentence = prevSentence.concat(curr);
            else
                newSentence = prevSentence.concat(" ", curr);
            sentences[prevIndex] = newSentence;
            sentences.splice(i,1);
            i--;
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
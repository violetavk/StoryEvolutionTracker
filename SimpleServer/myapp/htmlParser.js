#!/usr/bin/env node
"use strict";

let http = require("http");
let url = require("url");
let bl = require("bl");
let cheerio = require("cheerio");
let natural = require("natural");

let sentenceTokenizer = new natural.SentenceTokenizer();

let htmlParser = function(toParse) {
    console.log("---Beginning Parsing---");
    let bufferlist = bl();

    let link = url.parse(toParse);

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
            parse(bufferlist);
        })
        response.on("error", function(err) {
            console.error(err);
        })

    });
};

// htmlParser(process.argv[2]); // testing only

function parse(buffer) {
    let pageData = buffer.toString();
    
    let pageObject = getBasics(pageData);

    pageObject.sentences = getSentences(pageObject);
    pageObject.article = concatSentences(pageObject);
    pageObject.frequencies = getWordFrequencies(pageObject);
    // console.log(pageObject.frequencies);
    getTfIdf(pageObject);
}

function getBasics(pageData) {
    let $ = cheerio.load(pageData); // parse into DOM

    let pageObject = { };

    // BBC
    pageObject.date = parseInt($(".date").attr("data-seconds"));
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
    let sentences = [];
    for(let par of pageObject.paragraphs) {
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

function getWordFrequencies(pageObject) {
    let freq = {};
    let wordTokenizer = new natural.WordTokenizer();

    let bolded = pageObject.bolded.toLowerCase();
    if(bolded != null) {
        let words = wordTokenizer.tokenize(bolded);
        for(let word of words) {
            if(!(word in freq)) {
                freq[word] = 1;
            } else {
                freq[word] = (freq[word] + 1);
            }
        }
    }

    let sentences = pageObject.sentences;
    for(let s of sentences) {
        s = s.toLowerCase();
        let words = wordTokenizer.tokenize(s);
        for(let word of words) {
            if(!(word in freq)) {
                freq[word] = 1;
            } else {
                freq[word] = (freq[word] + 1);
            }
        }
    }
    
    return freq;
}

function getTfIdf(pageObject) {
    let tfidf = new natural.TfIdf();
    let article = pageObject.article;
    let freq = pageObject.frequencies;
    tfidf.addDocument(article);
    let tfidfs = { };

    for(let word in freq) {
        tfidf.tfidfs(word,function(i, measure) {
            // console.log(word, measure);
            tfidfs[word] = measure;
        });
    }

    let sortedTfidfs = {};
    let sortable = [];
    for (let word in tfidfs)
          sortable.push([word, tfidfs[word]]);
    sortable.sort(function(a, b) {return b[1] - a[1]});
    console.log(sortable);
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
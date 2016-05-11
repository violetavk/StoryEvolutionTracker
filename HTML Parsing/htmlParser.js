#!/usr/bin/env node
"use strict";

let http = require("http");
let url = require("url");
let bl = require("bl");
let cheerio = require("cheerio");
let natural = require("natural");

let sentenceTokenizer = new natural.SentenceTokenizer();

let bufferlist = bl();

let link = url.parse(process.argv[2]);

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

function parse(buffer) {
    let pageData = buffer.toString();
    
    let pageObject = getBasics(pageData);
    console.log(pageObject);

    let sentences = [];
    for(let par of pageObject.paragraphs) {
        sentences.push(sentenceTokenizer.tokenize(par));
    }

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
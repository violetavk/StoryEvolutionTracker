'use strict';
let fs = require('fs');
let path = require('path');
let util = require("./util");
let parseHtml = require("./htmlParser").parseHTML;
let processText = require("./textProcessing").processText;
let generateSignatures = require("./signatureGeneration").generateSignatures;

const dir = "/Users/violet/Development/StoryEvolutionTracker/HTML Pages/";

exports.crawler = function(objects) {
    console.log("-----Crawling Web------");
    return new Promise(function(resolve,reject) {
        let pageObject = objects[2];
        let textObject = objects[3];
        let signatures = objects[4];

        let crawled = {};

        let fileNames = openDirectory();
        crawled.potentialFiles = getPotentialMatches(textObject,fileNames);
        parseAllPotentialArticles(crawled.potentialFiles)
            .then(chooseArticles)
            .then(function(result) {
                crawled.allArticles = result[0];
                objects.push(crawled);
                console.log(objects);
                resolve(objects);
            });

    });
};

function openDirectory() {
    let allFiles = fs.readdirSync(dir);
    let htmlFiles = [];
    for(let file of allFiles) {
        if(path.extname(file) === ".htm") {
            htmlFiles.push(file);
        }
    }
    return htmlFiles;
}

function getPotentialMatches(textObject,fileNames) {
    let topicWords = textObject.topicWords;
    let potential = [];
    for(let i = 0; i < fileNames.length; i++) {
        let file = fileNames[i];
        for(let j = 0; j < topicWords.length; j++) {
            let word = topicWords[j];
            let loc = file.toLowerCase().indexOf(word);
            let valid = true;
            if(loc > -1) {
                if(loc - 1 >= 0) {
                    let prevChar = file.charAt(loc-1);
                    if(util.isAlphaNum(prevChar))
                        valid = false;
                }
                if(loc + word.length < file.length) {
                    let nextChar = file.charAt(loc + word.length);
                    if(util.isAlphaNum(nextChar))
                        valid = false;
                }
                if(valid) {
                    potential.push(file);
                    break;
                }
            }
        }
    }
    return potential;
}

function parseAllPotentialArticles(potentialFiles) {
    return new Promise(function(resolve,reject) {
        let allArticles = [];
        for(let i = 0; i < potentialFiles.length; i++) {
            let file = potentialFiles[i];
            let toParse = "file://" + dir + file;
            console.log(toParse);
            let response = [["placeholder"],toParse];
            parseHtml(response)
                .then(processText)
                .then(generateSignatures)
                .then(function(res) {
                    allArticles.push(res);
                    if(i+1 === potentialFiles.length) {
                        resolve([allArticles]);
                    }
                });
        }
    });
}

function chooseArticles(objects) {
    console.log("--- Choosing which articles fit ---");
    return new Promise(function(resolve,reject) {
        console.log(objects.length);
        let allArticles = objects[0];

        // any other things, push to objects array
        // resolve with objects array
        resolve(objects);
    });
}

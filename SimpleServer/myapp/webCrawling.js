'use strict';
let fs = require('fs');
let path = require('path');
let util = require("./util");
let parseHtml = require("./htmlParser").parseHTML;
let processText = require("./textProcessing").processText;
let generateSignatures = require("./signatureGeneration").generateSignatures;

const dir = "/Users/violet/Development/StoryEvolutionTracker/HTML Pages/";

// searching on bbc: http://www.bbc.co.uk/search?filter=news&q=XXXXXXX

exports.crawler = function(objects) {
    console.log("-----Crawling Web------");
    return new Promise(function(resolve,reject) {
        let pageObject = objects.pageObject;
        let textObject = objects.textObject;
        let signatures = objects.signatures;

        let crawled = {};

        let fileNames = openDirectory();
        crawled.potentialFiles = getPotentialMatches(textObject,fileNames);

        // let responses = [{pageObject,textObject,signatures}, crawled.potentialFiles];
        let responses = {
            original:       {pageObject,textObject,signatures},
            potentialFiles: crawled.potentialFiles
        };
        parseAllPotentialArticles(responses)
            .then(chooseArticles)
            .then(function(result) {
                // this is the main control flow now once crawling operations are done
                crawled.allArticles = result.allArticles;
                crawled.points = result.points;
                crawled.avgPoints = result.avgPoints;

                objects.crawled = crawled;
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
    console.log("Get potential matches");
    let topicWords = textObject.topicWords;
    let potential = [];
    for(let i = 0; i < fileNames.length; i++) {
        let file = fileNames[i];
        for(let j = 0; j < topicWords.length; j++) {
            let valid = false;
            // console.log(topicWords[j]);
            for(let word of topicWords[j].split(" ")) {
                let loc = file.toLowerCase().indexOf(word);
                if(loc > -1) {
                    if(loc - 1 >= 0) {
                        let prevChar = file.charAt(loc-1);
                        if(!util.isAlphaNum(prevChar))
                            valid = true;
                    }
                    if(loc + word.length < file.length) {
                        let nextChar = file.charAt(loc + word.length);
                        if(!util.isAlphaNum(nextChar))
                            valid = true;
                        else
                            valid = false;
                    }
                    if(valid) {
                        potential.push(file);
                        break;
                    }
                }
            }
            if(valid) {
                break;
            }
        }
    }
    console.log(potential);
    return potential;
}

function parseAllPotentialArticles(responses) {
    let potentialFiles = responses.potentialFiles;
    return new Promise(function(resolve,reject) {
        let allArticles = [];
        if(potentialFiles.length === 0) {
            responses.allArticles = allArticles;
            resolve(responses);
        }
        for(let i = 0; i < potentialFiles.length; i++) {
            let file = potentialFiles[i];
            let toParse = "file://" + dir + file;
            console.log(toParse);
            // let response = [["placeholder"],toParse];
            let objs = {
                response:   ["placeholder"],
                link:       toParse
            };
            parseHtml(objs)
                .then(processText)
                .then(generateSignatures)
                .then(function(res) {
                    allArticles.push(res);
                    if(i+1 === potentialFiles.length) {
                        responses.allArticles = allArticles;
                        resolve(responses);
                    }
                });
        }
    });
}

function chooseArticles(responses) {
    console.log("--- Choosing which articles fit ---");
    return new Promise(function(resolve,reject) {
        let mainArticle = responses.original;
        let mainArticleHeadline = mainArticle.pageObject.headline;
        let mainTopicWords = mainArticle.textObject.topicWords;
        let numTopicWords = mainTopicWords.length;
        let allArticles = responses.allArticles;
        let points = [];
        let overlap = [];

        for(let i = 0; i < allArticles.length; i++) {
            let currHeadline = allArticles[i].pageObject.headline;
            let topicWords = allArticles[i].textObject.topicWords;
            points[i] = 0;
            overlap[i] = 0;

            // delete the queried article from list of matches so it doesn't skew algorithm later on
            if(currHeadline === mainArticleHeadline) {
                allArticles.splice(i,1);
                i--;
                continue;
            }

            // calculate how many points to add for each article
            for(let j = 0; j < topicWords.length; j++) {
                let currTopicWord = topicWords[j];
                for(let k = 0; k < mainTopicWords.length; k++) { // looping thru main topic words
                    let mainTopicWord = mainTopicWords[k];
                    if(currTopicWord === mainTopicWord) {
                        // if curr topic word matches main topic word exactly
                        let absValue = Math.abs(j-k);
                        let toAdd = (numTopicWords - k) + (numTopicWords - absValue) * 5;
                        points[i] += toAdd;
                        overlap[i] += 1;
                    } else {
                        // not exact match, see if there is any subset to assign some amt of points

                    }
                }
            }
        }

        // calculate any deductions
        for(let i = 0; i < allArticles.length; i++) {
            points[i] = points[i] - (numTopicWords - overlap[i]);
        }

        // calculate average of points
        let avgPoints = 0;
        for(let i = 0; i < points.length; i++) {
            let pt = points[i];
            avgPoints += pt;
            allArticles[i].points = pt;
        }
        avgPoints = avgPoints / points.length;
        console.log(points);
        console.log(avgPoints);
        console.log(overlap);
        responses.points = points;
        responses.avgPoints = avgPoints;

        let allRelevantArticles = getAllRelevantArticles(allArticles);

        // any other things, push to objects array
        // resolve with objects array
        resolve(responses);
    });
}

function getAllRelevantArticles(allArticles) {
    let relevantArticles = [];
}

function getMostRelevantArticle(allArticles,points) {

}

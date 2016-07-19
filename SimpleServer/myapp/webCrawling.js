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
        let pageObject = objects[2];
        let textObject = objects[3];
        let signatures = objects[4];

        let crawled = {};

        let fileNames = openDirectory();
        crawled.potentialFiles = getPotentialMatches(textObject,fileNames);

        let responses = [{pageObject,textObject,signatures}, crawled.potentialFiles];
        parseAllPotentialArticles(responses)
            .then(chooseArticles)
            .then(function(result) {
                // this is the main control flow now once crawling operations are done
                crawled.allArticles = result[2];
                crawled.points = result[3];

                objects.push(crawled);
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
            console.log(topicWords[j]);
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
    let potentialFiles = responses[1];
    return new Promise(function(resolve,reject) {
        let allArticles = [];
        if(potentialFiles.length === 0) {
            responses.push(allArticles);
            resolve(responses);
        }
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
                        responses.push(allArticles);
                        resolve(responses);
                    }
                });
        }
    });
}

function chooseArticles(responses) {
    console.log("--- Choosing which articles fit ---");
    return new Promise(function(resolve,reject) {
        let mainArticle = responses[0];
        let mainArticleHeadline = mainArticle.pageObject.headline;
        let mainTopicWords = mainArticle.textObject.topicWords;
        let numTopicWords = mainTopicWords.length;
        let allArticles = responses[2];
        let points = [];

        for(let i = 0; i < allArticles.length; i++) {
            let currHeadline = allArticles[i][2].headline;
            let topicWords = allArticles[i][3].topicWords;
            points[i] = 0;

            // delete the queried article from list of matches so it doesn't skew algorithm later on
            if(currHeadline === mainArticleHeadline) {
                allArticles.splice(i,1);
                i--;
                continue;
            }

            // console.log("Testing", topicWords);
            for(let j = 0; j < topicWords.length; j++) {
                let currTopicWord = topicWords[j];
                // console.log(" ",currTopicWord);
                for(let k = 0; k < mainTopicWords.length; k++) {
                    // looping thru main topic words
                    let mainTopicWord = mainTopicWords[k];
                    // console.log("  ",mainTopicWord,"?");
                    if(currTopicWord === mainTopicWord) {
                        // if curr topic word matches main topic word exactly
                        // console.log("    EXACT MATCH");
                        let absValue = Math.abs(j-k);
                        let toAdd = (numTopicWords - k) + (numTopicWords - absValue) * 5;
                        // console.log("    Will assign",toAdd);
                        points[i] += toAdd;
                    } else {
                        // not exact match, see if there is any subset to assign some amt of points
                    }
                }
            }
        }
        let avgPoints = 0;
        for(let pt of points)
            avgPoints += pt;
        avgPoints = avgPoints / points.length;

        console.log(points);
        console.log("avg:",avgPoints);
        responses.push([points,avgPoints]);

        let allRelevantArticles = getAllRelevantArticles(allArticles,points);

        // any other things, push to objects array
        // resolve with objects array
        resolve(responses);
    });
}

function getAllRelevantArticles(allArticles,points) {

}

function getMostRelevantArticle(allArticles,points) {

}

'use strict';
let fs = require('fs');
let path = require('path');
let util = require("./util");
let http = require("http");
let url = require("url");
let bl = require("bl");
let cheerio = require("cheerio");
let parseHtml = require("./htmlParser").parseHTML;
let processText = require("./textProcessing").processText;
let generateSignatures = require("./signatureGeneration").generateSignatures;

const dir = "/Users/violet/Development/StoryEvolutionTracker/HTML Pages/";

// searching on bbc: http://www.bbc.co.uk/search?filter=news&q=XXXXXXX

exports.crawler = function(objects) {
    console.log("-----Crawling Web------");
    return new Promise(function(resolve,reject) {
        let starttime = Date.now();
        let pageObject = objects.pageObject;
        let textObject = objects.textObject;
        let signatures = objects.signatures;

        let crawled = {};

        let fileNames = openDirectory();
        crawled.potentialFiles = getPotentialMatches(textObject.topicWords,fileNames);

        let responses = {
            original:       {pageObject,textObject,signatures},
            potentialFiles: crawled.potentialFiles,
            isLocal: true
        };
        parseAllPotentialArticles(responses)
            .then(chooseArticles)
            .then(function(result) {
                // this is the main control flow now once crawling operations are done
                crawled.allArticles = result.allArticles;
                crawled.points = result.points;
                crawled.avgPoints = result.avgPoints;
                crawled.relevantArticles = result.relevantArticles;
                crawled.chosenOne = result.chosenOne;
                crawled.modifiedTopicWords = result.modifiedTopicWords;

                objects.crawled = crawled;
                let endtime = Date.now();
                console.log("Duration:",(endtime-starttime),"millis");
                resolve(objects);
            });

    });
};

exports.webCrawler = function(words,timestamp) {
    console.log("----Crawling REAL web----");
    return new Promise(function(resolve,reject) {
        let bufferList = bl();
        let searchURL = modifyURL(words);
        http.get(searchURL, function(response) {
            response.on("data", function(data) {
                bufferList.append(data);
            });
            response.on("end", function(data) {
                getNextArticle(bufferList,words,timestamp,function(objs) {
                    resolve(objs);
                });
            });
            response.on("error", function(err) {
                console.error(err);
            })
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

function getPotentialMatches(topicWords,articles) {
    console.log("Get potential matches");
    let potential = [];
    for(let i = 0; i < articles.length; i++) {
        let article = articles[i];
        let headlineMatchCount = 0;
        let headline = "";

        // have it flexible for string argument and article argument 
        if(typeof article === "string") {
            headline = article;
        } else {
            headline = article.headline;
        }

        for(let j = 0; j < topicWords.length; j++) {
            let valid = false;
            for(let word of topicWords[j].split(" ")) {
                let loc = headline.toLowerCase().indexOf(word);
                if(loc > -1) {
                    if(loc - 1 >= 0) {
                        let prevChar = headline.charAt(loc-1);
                        if(!util.isAlphaNum(prevChar))
                            valid = true;
                    }
                    if(loc + word.length < headline.length) {
                        let nextChar = headline.charAt(loc + word.length);
                        if(!util.isAlphaNum(nextChar))
                            valid = true;
                        else
                            valid = false;
                    }
                    if(valid) {
                        // potential.push(headline);
                        headlineMatchCount++;
                        break;
                    }
                }
            }
            if(headlineMatchCount === 1) {
                potential.push(article);
                break;
            }
        }
    }
    return potential;
}

function parseAllPotentialArticles(responses) {
    let potentialFiles = responses.potentialFiles;
    let done = 0;
    return new Promise(function(resolve,reject) {
        let allArticles = [];

        // if no potential files were found before, stop here
        if(potentialFiles.length === 0) {
            responses.allArticles = allArticles;
            resolve(responses);
        }

        // parse all the potential files to get their details
        for(let i = 0; i < potentialFiles.length; i++) {
            let file = potentialFiles[i];
            let toParse = "";

            if(responses.isLocal) {
                toParse = "file://" + dir + file;
            } else {
                toParse = file.link;
            }
            console.log(toParse);

            let objs = {
                link:       toParse
            };
            parseHtml(objs)
                .then(processText)
                .then(generateSignatures)
                .then(function(res) {
                    allArticles.push(res);
                    done++;
                    if(done === potentialFiles.length) {
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
        let mainArticleHeadline = "", mainTopicWords = [], mainTimestamp = 0, numTopicWords = 0;
        if(responses.isLocal) {
            mainArticleHeadline = mainArticle.pageObject.headline;
            mainTopicWords = mainArticle.textObject.topicWords;
            mainTimestamp = mainArticle.pageObject.date;
        } else {
            mainArticleHeadline = "n/a";
            mainTopicWords = responses.topicWords;
            mainTimestamp = responses.timestamp;
        }
        numTopicWords = mainTopicWords.length;
        let allArticles = responses.allArticles;
        let points = [];
        let overlap = [];
        for(let i = 0; i < allArticles.length; i++) {

            let currHeadline = allArticles[i].pageObject.headline;
            let topicWords = allArticles[i].textObject.topicWords;

            // criteria for deleting an article: if it matches original exactly, if it doesn't have a signature, or it is older than original
            if(currHeadline === mainArticleHeadline ||
                !allArticles[i].signatures.plainSignature ||
                mainTimestamp > allArticles[i].pageObject.date) {
                    allArticles.splice(i,1);
                    i--;
                    continue;
            }

            points[i] = 0;
            overlap[i] = 0;

            // calculate how many points to add for each article
            for(let j = 0; j < topicWords.length; j++) {
                let currTopicWord = topicWords[j];
                for(let k = 0; k < mainTopicWords.length; k++) { // looping thru main topic words
                    let mainTopicWord = mainTopicWords[k];

                    /* calculate how many relevance points to add */
                    let absValue = Math.abs(j-k);
                    // let toAdd = (numTopicWords - k) + (numTopicWords - absValue) * numTopicWords; // 1
                    // let toAdd = (numTopicWords - k) + (numTopicWords - absValue); // 2
                    // let toAdd = (numTopicWords - absValue); // 3
                    let toAdd = (numTopicWords - k) + (numTopicWords/(absValue+1)) + j; // 4
                    // let toAdd = (numTopicWords/(absValue+1)); // 5

                    if(currTopicWord === mainTopicWord) {
                        // if curr topic word matches main topic word exactly
                        points[i] += toAdd;
                        overlap[i] += 1;
                    } else {
                        // not exact match, see if there is any subset to assign some amt of points
                        let spl = currTopicWord.split(" ");
                        if(spl.length === 1) continue;
                        for(let ind of spl) {
                            if(mainTopicWord.indexOf(ind) > -1) {
                                points[i] += (toAdd * 0.5);
                                overlap[i] += 0.5;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // calculate any deductions
        for(let i = 0; i < allArticles.length; i++) {
            points[i] = points[i] - (numTopicWords - overlap[i]);
        }

        // if there are no articles to process, finish here, b/c next steps require at least 1 article
        if(allArticles.length === 0) {
            responses.avgPoints = 0;
            responses.relevantArticles = [];
            resolve(responses);
        }

        // calculate average of points
        let avgPoints = 0;
        for(let i = 0; i < points.length; i++) {
            let pt = points[i];
            avgPoints += pt;
            allArticles[i].points = pt;
            allArticles[i].overlap = overlap[i]/numTopicWords;
        }
        avgPoints = avgPoints / points.length;
        responses.avgPoints = avgPoints;
        responses.relevantArticles = getAllRelevantArticles(allArticles,avgPoints);
        responses.chosenOne = getMostRelevantArticle(responses.relevantArticles);
        // responses.modifiedTopicWords = mergeTopicWords(mainArticle,responses.chosenOne);
        resolve(responses);
    });
}

function getAllRelevantArticles(allArticles, avg) {
    let relevantArticles = [];
    for(let article of allArticles) {
        let pts = article.points;
        let overlap = article.overlap;
        if(pts >= avg && overlap >= 0.25) { // threshold = 0.25
            if(relevantArticles.length === 0)
                relevantArticles.push(article);
            else {
                for(let i = 0; i < relevantArticles.length; i++) {
                    if(pts >= relevantArticles[i].points) {
                        relevantArticles.splice(i,0,article);
                        break;
                    } else if(i + 1 === relevantArticles.length) {
                        relevantArticles.push(article);
                        break;
                    }
                }
            }
        }
    }
    return relevantArticles;
}

function getMostRelevantArticle(relevantArticles) {
    return relevantArticles[0];
}

function mergeTopicWords(original,newer) { // can change this later on to include flag for positive or negative
    let originalTW = original.textObject.topicWords;
    let newTW = newer.textObject.topicWords;

    // for webapp "crawler" module only
    if(originalTW instanceof Array) {
        let tmp = {};
        for(let w of originalTW) {
            tmp[w] = 1;
        }
        originalTW = tmp;
    }

    // increment each word to strengthen
    for(let word of newTW) {
        if(originalTW[word] > 0)
            originalTW[word] = (originalTW[word] + 1);
        else
            originalTW[word] = 1;
    }

    // finally sort
    let sorted = [];
    let sortedObj = {};
    for(let word in originalTW)
        sorted.push([word,originalTW[word]]);
    sorted.sort(function(a,b) {return b[1] - a[1];});
    for(let i = 0; i < sorted.length; i++) {
        sortedObj[sorted[i][0]] = sorted[i][1];
    }
    console.log(sortedObj);
    return sortedObj;
}

function modifyURL(words) {
    let searchURL = "http://www.bbc.co.uk/search?filter=news&q=";
    for(let i = 0; i < 3; i++) {
        let word = words[i];
        if(word.indexOf(" ") > -1) {
            word = word.replace(/\s/g,'+');
        }
        console.log(word);
        searchURL += (word + "+");
    }
    console.log(searchURL);
    let link = url.parse(searchURL);
    return {
        host: link.host,
        port: 80,
        path: link.path
    };
}

function getNextArticle(bufferList,words,timestamp,cb) {
    let pageData = bufferList.toString();
    let allResults = getAllResults(pageData);
    allResults = filterOnTimestamp(allResults,timestamp);
    allResults = getPotentialMatches(words,allResults);
    let responses = {
        potentialFiles: allResults,
        isLocal: false,
        topicWords: words,
        timestamp: timestamp
    };
    parseAllPotentialArticles(responses)
        .then(chooseArticles)
        .then(cb);
}

function getAllResults(pageData) {
    let $ = cheerio.load(pageData);
    let results = [];
    let htmlResults = $(".search-results").find("li");
    htmlResults.each(function(i, elem) {
        let result = {};
        let allChildren = $(this).children().first().children();
        // get date
        result.date = Date.parse(allChildren.find("time").first().attr("datetime"))/1000;
        // get headline
        let headline = allChildren.find("h1").attr("itemprop","headline").first();
        result.headline = headline.text();
        // get url
        let link = headline.find("a").attr("href");
        result.link = link;
        // done with this one, add result
        results.push(result);
    });
    return results;
}

function filterOnTimestamp(articles,timestamp) {
    for(let i = 0; i < articles.length; i++) {
        let article = articles[i];
        if(timestamp > article.date) {
            articles.splice(i,1);
            i--;
        }
    }
    return articles;
}
'use strict';
let fs = require('fs');
let path = require('path');
let util = require("./util");
let http = require("http");
let url = require("url");
let bl = require("bl");
let cheerio = require("cheerio");
let storyevolutiontracker = require("./storyevolutiontracker");

/* Local directory for saved news articles - change this if you wish to test with local articles */
const dir = "/Users/violet/Development/StoryEvolutionTracker/HTML Pages/";

/* DEVELOPMENT ONLY - crawling for local directory only*/
exports.crawler = function(objects) {
    console.log("-----Crawling Web------");
    return new Promise(function(resolve,reject) {
        try {
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
                objects.crawled = crawled;
                let endtime = Date.now();
                console.log("Duration:",(endtime-starttime),"millis");
                resolve(objects);
            });
        } catch (error) {
            reject(error);   
        }
    });
};

/* MAIN FUNCTION that is called to find updates for a story */
exports.webCrawler = function(words,timestamp,category) {
    console.log("----Crawling REAL web----");
    return new Promise(function(resolve,reject) {
        try {
            let bufferList = bl();
            let searchURL = modifyURL(words,category);
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
        } catch (error) {
            reject(error);
        }
    });
};

/* opens directory for local crawling */
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

/* finds potential matches by comparing topic words and headlines */
function getPotentialMatches(topicWords,articles) {
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

/* parses all potential files to retrieve topic words and signatures */
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
                if(!file.link.includes("www.bbc.co.uk/news") && !file.link.includes("www.bbc.co.uk/sport")) {
                    potentialFiles.splice(i,1);
                    i--;
                    continue;
                }
                toParse = file.link;
            }
            console.log(toParse);

            storyevolutiontracker.parseAndGenerateSignature(toParse, function(res) {
                allArticles.push(res);
                done++;
                console.log("Done",done,"out of",potentialFiles.length,"\n");
                if(done === potentialFiles.length) {
                    responses.allArticles = allArticles;
                    console.log("DONE parsing all articles");
                    resolve(responses);
                }
            });
        }
    });
}

/* chooses an article for story after parsing all articles */
function chooseArticles(responses) {
    console.log("--- Choosing which articles fit ---");
    return new Promise(function(resolve,reject) {
        try {
        let mainArticle = {}, mainArticleHeadline = "", mainTopicWords = [], mainTimestamp = 0, numTopicWords = 0;
        if(responses.isLocal) {
            mainArticle = responses.original;
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

            if(allArticles[i].error) {
                console.log("Skipping because this article is not suitable");
                allArticles.splice(i,1);
                i--;
                continue;
            }

            let currHeadline = allArticles[i].pageObject.headline;
            let topicWords = allArticles[i].textObject.topicWords;

            // criteria for deleting an article: if it matches original exactly, if it doesn't have a signature, or it is older than original
            if(currHeadline === mainArticleHeadline) {
                console.log("Skipping because headline is the same");
                allArticles.splice(i,1);
                i--;
                continue;
            }
            if(!allArticles[i].signatures.plainSignature) {
                console.log("There was no signature, skipping");
                allArticles.splice(i,1);
                i--;
                continue;
            }
            if(mainTimestamp >= allArticles[i].pageObject.date) {
                console.log("Skipping because curr article is newer");
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
            console.log(allArticles[i].pageObject.headline,"- Points:",points[i],", Overlap:",overlap[i]);
        }

        // if there are no articles to process, finish here, b/c next steps require at least 1 article
        if(allArticles.length === 0) {
            responses.avgPoints = 0;
            responses.relevantArticles = [];
            responses.chosenOne = 0;
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
        if(responses.relevantArticles.length === 0) {
            responses.chosenOne = 0;
            resolve(responses);
        }
        responses.chosenOne = getMostRelevantArticle(responses.relevantArticles);
        console.log("Chosen one:",responses.chosenOne.pageObject.headline);
        resolve(responses);
        } catch (error) {
            reject(error);
        }
    });
}

/* retrieves only the relevant articles according to the threshold */
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

/* most relevant article is first one so return it */
function getMostRelevantArticle(relevantArticles) {
    return relevantArticles[0];
}

/* build a URL to perform a search criteria with on BBC */
function modifyURL(words,category) {
    let searchURL = "http://www.bbc.co.uk/search?filter=" + category + "&q="; // searching the BBC, first page of results only
    for(let i = 0; i < 2; i++) {
        let word = words[i];
        if(word.indexOf(" ") > -1) {
            word = word.replace(/\s/g,'+');
        }
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

/* main function that is called after retrieving search results */
function getNextArticle(bufferList,words,timestamp,cb) {
    let pageData = bufferList.toString();
    let allResults = getAllResults(pageData);
    // allResults = filterOnTimestamp(allResults,timestamp);
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

/* parses search results page to extract only useful info */
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

/* filters on timestamp during article selection from search results */
function filterOnTimestamp(articles,timestamp) {
    // even though articles are filtered on timestamp later, save some performance of not parsing unnecessary articles
    for(let i = 0; i < articles.length; i++) {
        let article = articles[i];
        if(timestamp >= article.date) {
            articles.splice(i,1);
            i--;
        }
    }
    return articles;
}
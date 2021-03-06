"use strict";
let http = require("http");
let url = require("url");
let bl = require("bl");
let cheerio = require("cheerio");
let natural = require("natural");
let fs = require("fs");
let parsers = require("./parsers.js");
let util = require("./util.js");

/* the main function that initiates html parsing */
exports.parseHTML = function(objects) {
    return new Promise(function(resolve, reject) {
        console.log("-- HTML Parsing (with promises):",objects.link," --");
        let bufferList = bl();

        let link = url.parse(objects.link);

        let pageObject;

        let options = {
            host: link.host,
            port: 80,
            path: link.path
        };

        if(link.protocol === "file:") {
            // open file
            let path = decodeURIComponent(link.path);
            options.path = path;
            let file = fs.readFileSync(path).toString();

            // get the original URL from the saved file
            let result = file.match(/<!-- saved from url.* -->/g)[0];
            if(!result)
                reject(new Error("Could not locate URL in stored HTML code"));
            let originalURL = result.match(/http:\S*/g)[0];
            if(!originalURL)
                reject(new Error("Could not locate URL in matched HTML snippet"));
            let retrievedURL = url.parse(originalURL);
            options.host = retrievedURL.host;
            options.path = retrievedURL.path;

            // parse file as normal
            pageObject = parse(file,options);
            pageObject.link = objects.link;
            objects.pageObject = pageObject;
            resolve(objects);

        } else if(link.protocol === "http:") {
            // use GET request to get from internet
            if(link.path.includes("/live/")) {
                reject({error: "Live articles not suitable for tracking"});
            }
            http.get(options, function(response) {
                response.on("data", function(data) {
                    bufferList.append(data);
                });
                response.on("end", function(data) {
                    pageObject = parse(bufferList,options);

                    if(pageObject.error) {
                        reject(pageObject);
                    }
                    pageObject.category = options.path.split("/")[1];
                    pageObject.link = objects.link;
                    objects.pageObject = pageObject;
                    resolve(objects);
                });
                response.on("error", function(err) {
                    console.error(err);
                })
            });
        } else {
            reject({error: "Neither a file nor http url"});
        }
    });
};

/* main function for extracting information from article */
function parse(buffer,options) {
    let pageData = buffer.toString();
    let pageObject = getBasics(pageData,options);

    if(pageObject.error) {
        return pageObject;
    }

    pageObject.sentences = getSentences(pageObject);
    pageObject.article = concatSentences(pageObject);
    return pageObject;
}

/* use a parser specific for the source to do the extraction */
function getBasics(pageData,options) {
    let section = options.path.split("/")[1];

    if(options.host === "www.bbc.co.uk" && section === "news")
        return parsers.bbcParser(pageData);
    if(options.host === "www.bbc.co.uk" && section === "sport")
        return parsers.bbcSportsParser(pageData);

    return {error: "Not a BBC News or BBC Sport article"};
}

/* tokenize into sentences and extract only the useful sentences from the articles */
function getSentences(pageObject) {
    let sentenceTokenizer = new natural.SentenceTokenizer();
    let sentences = [];

    if(pageObject.headline) {
        let headline = pageObject.headline + ".";
        sentences.push(headline);
    }

    let firstParagraph = pageObject.paragraphs[0];
    if(firstParagraph && pageObject.bolded && !firstParagraph.includes(pageObject.bolded)) {
        pageObject.paragraphs.splice(0,0,pageObject.bolded);
    }

    for(let i = 0; i < pageObject.paragraphs.length; i++) {
        let par = pageObject.paragraphs[i];
        
        // if a paragraph does not have a period, do not include
        if(par.indexOf(".") < 0) {
            continue; 
        }

        // tokenize paragraph into individual sentences
        let currSent = sentenceTokenizer.tokenize(par);
        let openQuotes = false;
        for(let s of currSent) {
            if(s.includes("\"")) {
                let numQuotes = s.match(/"/g).length;

                // do not include all sentences within a pair of quotes
                if(openQuotes) continue;
                if(!openQuotes && numQuotes === 1) {
                    openQuotes = true;
                    continue;
                } else if(openQuotes && numQuotes === 1) {
                    openQuotes = false;
                    continue;
                }

                // do not include sentences where someone is being quoted
                if(isSpeakingSentence(s, numQuotes)) continue;

                // do not include sentences that begin with a " and end with a "
                if(s.charAt(0) === "\"" && s.charAt(s.length-1) === "\"") continue;

                // add the sentence if either no quotes, or num quotes is even (something may be simply quoted for emphasis)
                if(numQuotes % 2 === 0) 
                    sentences.push(s);
            }
            else if(openQuotes) {
                // skip over the sentence if currently inside a quote
            }
            else
                sentences.push(s);
        }
    }

    sentences = fixNames(sentences);
    sentences = fixImproperSplits(sentences);

    return sentences;
}

/* concatenate sentences that were improperly split on a name with title using a period */
function fixNames(sentences) {
    let titles = ["Mrs", "Mr", "Ms", "Miss", "Mx", "Dr", "Prof", "Hon", "Rev"];
    // process sentences to make sure they're correctly tokenized
    for(let i = 0; i < sentences.length; i++) {
        let curr = sentences[i];
        let lastChars = curr.substring((curr.length-5),curr.length);

        // case 1: sentence contains a title, like Mr.
        for(let title of titles) {
            let index = lastChars.indexOf(title);
            if(index > -1) {
                // there is a name title in this sentence
                let isPeriod = lastChars[lastChars.length-1];
                if(isPeriod === "." && (i+1) < sentences.length) {
                    // merge this sentence and the next to put the name back together
                    curr = curr.concat(" ", sentences[i+1]);
                    sentences[i] = curr;
                    sentences.splice(i+1,1);
                    i--;
                    break;
                }
            }
        }
    }
    return sentences; 
}

/* fix incorrect sentence tokenization where next sentence begins with lowercase letter */
function fixImproperSplits(sentences) {
    // if a sentence was tokenized incorrectly, like on a url, the next sentence begins with a lowercase letter
    for(let i = 0; i < sentences.length; i++) {
        let curr = sentences[i];
        let isLowerCase = /^[a-z0-9]+$/.test(curr[0]);
        let isURL = false;
        let wouldMergeWithHeadline = (i === 1);
        let possibleDomains = util.getAllPossibleDomains();
        for(let j = 0; j < possibleDomains.length; j++) {
            // checking if it's a URL, if it is, it must be in the beginning of the sentence b/c it was split apart
            if(curr.indexOf(possibleDomains[j]) === 0) {
                isURL = true;
                break;
            }
        }
        if(isLowerCase && i-1 >= 0) {
            // the first letter of the sentence is lowercase, so it must be merged with previous sentence
            let prevIndex = i - 1;
            let prevSentence = sentences[prevIndex];
            let newSentence = "";
            if(prevSentence.charAt(prevSentence.length-1) === ".") {
                if(isURL || (util.isNumeric(curr))) {
                    // simply concat with nothing else, b/c it's actually a URL
                    newSentence = prevSentence.concat(curr);
                } else {
                    // the sentence that is about to be merged isn't a URL, so make it look nice with prev
                    newSentence = prevSentence.substring(0,prevSentence.length-1).concat(", ",curr);
                }
            }
            else {
                // the prev sentence doesn't finish with a period, so just continue it
                newSentence = prevSentence.concat(" ", curr);
            }

            if(wouldMergeWithHeadline) {
                // if merging with previous headline, we don't want this to go away b/c its important
                sentences[i] = newSentence;
            } else {
                // the default case; remove the sentence with lowercase b/c it's part of prev now
                sentences[prevIndex] = newSentence;
                sentences.splice(i,1);
                i--;
            }
        }
    }
    return sentences;
}

/* concatenate all sentences to make one long string */
function concatSentences(pageObject) {
    let doc = "";
    if(pageObject.bolded) {
        doc += (pageObject.bolded + " ");
    }
    for(let s of pageObject.sentences) {
        doc += (s + " ");
    }
    return doc;
}

/* check is there is a quote in the sentence and someone is saying something */
function isSpeakingSentence(sentence, numQuotes) {
    if(numQuotes < 2) return false;
    let speakingWords = ["said","explained","read","commented"];
    let quoteIndexes = util.getAllIndexes(sentence,"\"");
    for(let word of speakingWords) {
        if(sentence.indexOf(word) > -1 && quoteIndexes.length === 2) {
            return (quoteIndexes[1] - quoteIndexes[0]) / sentence.length > 0.5;
        }
    }
    return false;
}

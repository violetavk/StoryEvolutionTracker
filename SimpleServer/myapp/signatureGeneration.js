'use strict';
let util = require("./util.js");

exports.generateSignatures = function(objects) {
    console.log("-- Generating Signatures --");
    return new Promise(function(resolve,reject) {
        let signatures = {};
        let pageObject = objects[2];
        let textObject = objects[3];

        signatures.topicWord = getMainTopicWord(textObject.tfidfs);
        signatures.sentenceTfIdfs = getSentenceTfIdfs(textObject.sentenceWordsArray,textObject.tfidfs);
        signatures.topSentences = getTopNSentences(signatures.sentenceTfIdfs, pageObject, 3);
        signatures.plainSignature = getPlainSignature(signatures);
        objects.push(signatures);
        resolve(objects);
    });
};

function getMainTopicWord(tfidfs) {
    // TODO assumptions are too strong here; not only words with spaces are proper nouns! Need to get back at caps
    let currLargestTfidf = 0;
    let topicWord = "";
    for(let word in tfidfs) {
        let currTfidf = tfidfs[word];
        if(currTfidf > currLargestTfidf && isProperNoun(word)) {
            currLargestTfidf = currTfidf;
            topicWord = word;
        }
    }
    return topicWord;
}

function getSentenceTfIdfs(sentences, tfidfs) {
    let values = [];
    for(let i = 0; i < sentences.length; i++) {
        let sentenceValue = 0;
        let sentence = sentences[i];
        for(let word of sentence) {
            let curr = tfidfs[word.toLowerCase()];
            if(curr)
                sentenceValue += curr;
        }
        sentenceValue = sentenceValue / (sentence.length); // test
        values.push([i, sentence, sentenceValue]);
    }
    values.sort(function(a,b) {return b[2] - a[2]});
    return values;
}

function getTopNSentences(sentenceTfIdfs, pageObject, n) {
    let actualSentences = pageObject.sentences;
    let temp = [];
    let topSentences = [];
    for(let i = 0; i < n && i < actualSentences.length; i++) {
        let tfIdfSentence = sentenceTfIdfs[i];
        let id = tfIdfSentence[0];
        if(id === 0) {
            // do not add the headline to the summary
            n++;
            continue;
        }
        temp.push(tfIdfSentence);
    }
    temp.sort(function(a,b) {return a[0] - b[0]});
    for(let i = 0; i < temp.length; i++) {
        topSentences.push(temp[i][1]);
    }
    return topSentences;
}

function getPlainSignature(signatures) {
    let topSentences = signatures.topSentences;
    let signature = "";

    for(let i = 0; i < topSentences.length; i++) {
        let sentence = "";
        let curr = topSentences[i];
        let insideQuotes = false;
        for(let j = 0; j < curr.length; j++) {
            let word = curr[j].trim();
            sentence += word;

            if(word === "\"") continue;

            // test whether to add space
            if(j+1 >= curr.length) continue;
            let nextWord = curr[j+1].trim();

            if(util.isAlpha(word) && util.isNumeric(nextWord)) {
                sentence += " ";
            }
            else if(nextWord === "." || nextWord === "," || util.isNumeric(nextWord)) {
                // just continue
            }
            else if(nextWord === "\"" && !insideQuotes) {
                insideQuotes = true;
                sentence += " ";
                console.log("entering quotes, curr word:",word,", next word:",nextWord);
            }
            else if(nextWord === "\"" && insideQuotes) {
                insideQuotes = false;
                console.log("leaving quotes, curr word:",word,", next word:",nextWord);
            }
            else {
                sentence += " ";
            }
        }
        signature += (sentence + " ");
    }

    return signature;
}

function isProperNoun(word) {
    return word.indexOf(" ") > -1;
}

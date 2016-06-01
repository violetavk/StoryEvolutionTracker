'use strict';
let natural = require("natural");

let textProcessor = function(pageObject) {
    console.log("-- Text Processing --");
    let textObject = getWordFrequencies(pageObject);
    textObject.tfidfs = getTfIdf(pageObject, textObject);
    return textObject;
};

function getWordFrequencies(pageObject) {
    console.log("Getting word frequencies");
    let textObject = {};
    let freq = {};
    let wordTokenizer = new natural.WordTokenizer();

    if(pageObject.bolded !== null) {
        console.log("Bolded is not null");
        let resp = sentenceWordFrequency(pageObject.bolded, freq, wordTokenizer);
        freq = resp;
    }

    let sentences = pageObject.sentences;
    for(let s of sentences) {
        let resp = sentenceWordFrequency(s, freq, wordTokenizer);
        freq = resp;
    }
    
    textObject.wordFrequencies = freq;
    return textObject;
}

function sentenceWordFrequency(str, freq, wordTokenizer) {
    str = str.toLowerCase();
    let words = wordTokenizer.tokenize(str);
    for(let word of words) {
        if(!(word in freq)) {
            freq[word] = 1;
        } else {
            freq[word] = (freq[word] + 1);
        }
    }
    return freq;
}

function getTfIdf(pageObject, textObject) {
    let tfidf = new natural.TfIdf();
    let article = pageObject.article;
    let freq = textObject.wordFrequencies;
    tfidf.addDocument(article);
    let tfidfs = { };

    for(let word in freq) {
        tfidf.tfidfs(word,function(i, measure) {
            // console.log(word, measure);
            tfidfs[word] = measure;
        });
    }
    return tfidfs;
}

module.exports = textProcessor;

'use strict';
let natural = require("natural");
let stemmer = require("porter-stemmer").stemmer;
let util = require("./util.js");

exports.processText = function(objects) {
    console.log("-- Text Processing (with promise) --");
    return new Promise(function(resolve,reject) {
        let pageObject = objects[2];

        let textObject = {};
        let processedWords = processWords(pageObject);
        textObject.sentenceWordsArray = processedWords.sentenceWords;
        textObject.properNouns = processedWords.properNouns;
        textObject.article = concatSentences(textObject);
        textObject.wordFrequencies = getWordFrequencies(textObject);
        textObject.tfidfs = getTfIdf(textObject);
        textObject.stemmedWords = stemWords(textObject);
        textObject.tfidfAvg = getTfIdfAverage(textObject.tfidfs);

        textObject = adjustTopicWords(textObject,pageObject);
        objects.push(textObject);
        resolve(objects);
    });
};

function processWords(pageObject) { // process words to detect certain classes of words
    let sentences = pageObject.sentences;

    let properNounsArray = detectProperNouns(sentences);
    let sentenceWords = properNounsArray.sentenceWords;
    let properNouns = properNounsArray.properNouns;

    sentenceWords = detectNames(sentenceWords);
    sentenceWords = detectHyphenatedWords(sentenceWords);
    sentenceWords = detectURLs(sentenceWords);
    sentenceWords = detectNumbers(sentenceWords);
    // detectCompoundNouns(sentenceWords);

    // detectCompoundNounsSentence(sentenceWords[0]);
    // detectCompoundNounsSentence(sentenceWords[1]);
    
    // sentenceWords = removePunctuation(sentenceWords);

    return {sentenceWords, properNouns};
}

function detectProperNouns(sentences) {
    let sentenceWords = [];
    let properNouns = [];
    let capsStart = -1;
    let wordTokenizer = new natural.WordPunctTokenizer();
    for(let s = 0; s < sentences.length; s++) {
        let sent = sentences[s];
        let words = wordTokenizer.tokenize(sent);
        for(let i = 0; i < words.length; i++) {
            let word = words[i];
            let isAlNum = util.isAlphaNum(word);
            let isUpper = util.isUpperCase(word);
            let isStop = util.isStopWord(word.toLowerCase());
            if(isUpper && isAlNum && !isStop) {
                if(capsStart === -1) {
                    capsStart = i;
                }
            } else if(capsStart !== -1 && util.isNumeric(word)) {
                continue;
            } else {
                let difference = i - capsStart;
                if(capsStart !== -1 && difference > 1) {
                    let compoundWord = getWordFromArray(capsStart, i-1, words);
                    console.log("--------- Found: " + compoundWord);
                    properNouns.push(compoundWord);
                    words[capsStart] = compoundWord;
                    words.splice(capsStart+1, difference-1);
                    i--;
                }
                capsStart = -1;
            }
        }
        sentenceWords.push(words);
    }
    return {sentenceWords,properNouns};
}

function detectNames(sentenceWords) {
    let titles = ["Mr", "Mrs", "Ms", "Miss", "Mx", "Dr", "Prof", "Hon", "Rev"];
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            let word = sentence[i];
            if(titles.indexOf(word) > -1) {
                // found a title, like Mr
                if((i + 1) < sentence.length && sentence[i+1] === "." && (i + 2) < sentence.length) {
                    // found a period after the title, so join the name following it
                    let name = word + sentence[i+1] + " " + sentence[i+2];
                    sentence[i] = name;
                    sentence.splice(i+1,2);
                    i--;
                }
            }
            sentenceWords[s] = sentence;
        }
    }
    return sentenceWords;
}

function detectHyphenatedWords(sentenceWords) {
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            let word = sentence[i];
            if((i + 1) < sentence.length && sentence[i+1] === "-" && (i+2) < sentence.length) {
                let hyphenated = sentence[i] + sentence[i+1] + sentence[i+2];
                console.log("Found hyphenated: " + hyphenated);
                sentence[i] = hyphenated;
                sentence.splice(i+1,2);
                i--;
            }
        }
        sentenceWords[s] = sentence;
    }
    return sentenceWords;
}

function detectURLs(sentenceWords) {
    let possibleDomains = ["com","net","co","uk","ru","de","org","jp","fr","br","it","au","edu","gov","ch","us","ca","io"];
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            let word = sentence[i];
            if((i + 1) < sentence.length && sentence[i+1] === "." && (i+2) < sentence.length) {
                let ending = sentence[i+2];
                let isDomain = possibleDomains.indexOf(ending) > -1;
                if(isDomain) {
                    let link = word + sentence[i+1] + ending;
                    console.log("Found url: " + link);
                    sentence[i] = link;
                    sentence.splice(i+1,2);
                    i--;
                }
            }
        }
        sentenceWords[s] = sentence;
    }
    return sentenceWords;
}

function detectNumbers(sentenceWords) {
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            let word = sentence[i];
            if((i+1) < sentence.length && sentence[i+1] === "," && (i+1) < sentence.length) {
                let number = word + sentence[i+1] + sentence[i+2];
                console.log("Found number: " + number);
                sentence[i] = number;
                sentence.splice(i+1, 2);
                i--;
            }
        }
        sentenceWords[s] = sentence;
    }
    return sentenceWords;
}

function removePunctuation(sentenceWords) {
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            let word = sentence[i];
            if(!util.isAlphaNum(word)) {
                sentence.splice(i,1);
                i--;
            }
        }
        sentenceWords[s] = sentence;
    }
    return sentenceWords;
}

function detectCompoundNounsSentence(sentence) {
    console.log("Detecting inside: ",sentence);
    for(let i = 0; i < sentence.length; i++) {
        let word = sentence[i];
        if(util.isStopWord(word.toLowerCase())) continue;
        if(!util.isAlphaNum(word.toLowerCase())) continue;
        if(i+1 < sentence.length) {
            let followingWord = sentence[i+1];
            let isAlNum = util.isAlphaNum(followingWord.toLowerCase());
            let stopWord = util.isStopWord(followingWord.toLowerCase());
            if(isAlNum && !stopWord) {
                console.log("Compound word: ",word,followingWord);
            }
        }
    }
}

function detectCompoundNouns(sentenceWords) {
    let followsMatrix = {};
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            let word = sentence[i];
            if(util.isStopWord(word.toLowerCase())) continue;
            if(!util.isAlphaNum(word.toLowerCase())) continue;
            followsMatrix[word] = [];
            if(i + 1 < sentence.length) {
                let followingWord = sentence[i+1];
                if(util.isStopWord(followingWord)) continue;
                // console.log("After",word," comes ",followingWord);
                let isAlNum = util.isAlphaNum(followingWord.toLowerCase());
                let stopWord = util.isStopWord(followingWord.toLowerCase());
                if(isAlNum && !stopWord) {
                    // console.log("--Registering this");
                    followsMatrix[word].push(followingWord);
                }
            }
        }
    }
    console.log(followsMatrix);
    return followsMatrix;
}

function concatSentences(textObject) { // represents entire article as array of words
    let article = [];
    let sentences = textObject.sentenceWordsArray;
    for(let sentence of sentences) {
        article = article.concat(sentence);
    }
    for(let i = 0; i < article.length; i++) {
        article[i] = article[i].toLowerCase();
    }
    return article;
}

function getWordFrequencies(textObject) {
    let freq = {};
    let sentences = textObject.sentenceWordsArray;
    for(let sentence of sentences) {
        for(let word of sentence) {
            word = word.toLowerCase();

            if(util.isStopWord(word)) continue;
            if(!util.isAlphaNum(word)) continue;

            if(!(word in freq)) {
                freq[word] = 1;
            } else {
                freq[word] = (freq[word] + 1);
            }
        }
    }
    return freq;
}

function getTfIdf(textObject) {
    let tfidf = new natural.TfIdf();
    let article = textObject.article;
    let freq = textObject.wordFrequencies;

    tfidf.addDocument(article);

    let tfidfs = { };
    for(let word in freq) {
        if(util.isNumeric(word)) continue;

        let toTest = [];
        toTest.push(word);
        tfidfs[word] = tfidf.tfidf(toTest, 0);
    }
    return tfidfs;
}

function adjustTopicWords(textObject, pageObject) {
    // there will be a variety of processes in here
    let sentences = textObject.sentenceWordsArray;
    let tfidfs = textObject.tfidfs;

    tfidfs = weighHeadline(textObject,pageObject);
    tfidfs = weighSection(tfidfs,pageObject.section);
    tfidfs = weighBolded(textObject,pageObject);

    getMainWordsDistribution(tfidfs);

    textObject.tfidfs = tfidfs;
    return textObject;
}

function getMainWordsDistribution(tfidfs) {

}

function weighHeadline(textObject,pageObject) {
    if(!pageObject.headline) return textObject.tfidfs;
    let tfidfs = textObject.tfidfs;
    let sentences = textObject.sentenceWordsArray;

    let headline = sentences[0];
    if(!headline) return tfidfs;
    for(let word of headline) {
        word = word.toLowerCase();
        if(util.isStopWord(word)) continue;
        let currTfidf = tfidfs[word];
        if(currTfidf) {
            tfidfs[word] = tfidfs[word] + textObject.tfidfAvg; // increase importance of word if it's in headline, avg?
        }
    }
    return tfidfs;
}

function weighSection(tfidfs, section) {
    console.log("Testing section: ",section);
    section = section.toLowerCase();
    let sectionTfidf = tfidfs[section];
    if(sectionTfidf) {
        tfidfs[sectionTfidf] = tfidfs[section] + 0.5;

    }
    return tfidfs;
}

function weighBolded(textObject,pageObject) {
    if(!pageObject.bolded) return textObject.tfidfs;
    let tfidfs = textObject.tfidfs;
    let sentences = textObject.sentenceWordsArray;
    let bolded  = sentences[1];
    for(let word of bolded) {
        word = word.toLowerCase();
        if(util.isStopWord(word)) continue;
        if(!util.isAlphaNum(word)) continue;
        if(tfidfs[word]) {
            tfidfs[word] = tfidfs[word] + textObject.tfidfAvg * 0.75; // a proportion of avg (as important but not quite)
        }
    }
    return tfidfs;
}

function getTfIdfAverage(tfidfs) {
    let sum = 0;
    let number = 0;
    for(let word in tfidfs) {
        sum += tfidfs[word];
        number++;
    }
    return sum / number;
}

function stemWords(textObject) { // stem words using porter-stemmer
    let sentences = textObject.sentenceWordsArray;
    let stemmed = {};

    for(let sentence of sentences) {
        for(let word of sentence) {
            word = word.toLowerCase();
            if(util.isStopWord(word.toLowerCase())) continue;
            if(!util.isAlphaNum(word.toLowerCase())) continue;

            let isNormal = util.isNormalWord(word);
            let stemmedWord = word;
            if(isNormal)
                stemmedWord = stemmer(word); // stem word only if a normal word, not a name, hyphenated, etc.
            if(!(stemmedWord in stemmed)) {
                stemmed[stemmedWord] = [];
                stemmed[stemmedWord].push(word);
            } else {
                if(stemmed[stemmedWord].indexOf(word) < 0)
                    stemmed[stemmedWord].push(word);
            }
        }
    }

    return stemmed;
}

function getDisplayWord(textObject, word) {
    let stemmedWords = textObject.stemmedWords;
    let tfidfs = textObject.tfidfs;
    let relatedWords = stemmedWords[word];
    let displayWord = relatedWords[0];
    let displayWordTfIdf = tfidfs[displayWord];

    for(let i = 1; i < relatedWords.length; i++) {
        let nextWord = relatedWords[i];
        let nextTfIdf = tfidfs[nextWord];
        if(nextTfIdf > displayWordTfIdf) {
            displayWord = nextWord;
            displayWordTfIdf = nextTfIdf;
        }
    }

    return displayWord;
}

function getWordFromArray(startIndex, endIndex, wordsArray) {
    let word = "";
    for(let i = startIndex; i <= endIndex; i++) {
        let curr = wordsArray[i];
        word += curr;
        if(i !== endIndex) {
            word += " ";
        }
    }
    return word;
}

// module.exports = textProcessor;

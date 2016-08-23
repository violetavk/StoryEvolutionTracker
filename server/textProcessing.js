'use strict';
let natural = require("natural");
let stemmer = require("porter-stemmer").stemmer;
let util = require("./util.js");
let pos = require('pos');
let nlp = require("nlp_compromise");

/* the main function that initiates text processing; it is part of a chain of operations,
preceded by html parsing and succeeded by signature generation */
exports.processText = function(objects) {
    console.log("-- Text Processing for ",objects.pageObject.headline,"--");
    return new Promise(function(resolve,reject) {
        let pageObject = objects.pageObject;

        let textObject = {};
        let processedWords = processWords(pageObject);
        textObject.sentenceWordsArray = processedWords.sentenceWords;
        textObject.properNouns = processedWords.properNouns;
        textObject.article = concatSentences(textObject);
        textObject.properNounsObject = getAllProperNouns(textObject);
        textObject.wordFrequencies = getWordFrequencies(textObject);
        textObject.importanceValues = getImportances(textObject);
        textObject.stemmedWords = stemWords(textObject);
        textObject.importanceAvg = getImportanceAverage(textObject.importanceValues);
        detectEquivalentNames(textObject.sentenceWordsArray, textObject.properNouns);
        textObject = adjustTopicWords(textObject,pageObject);
        textObject.topicWords = getTopicWords(textObject,8);
        textObject.topicWordsFreq = convertToObject(textObject.topicWords);
        objects.textObject = textObject;

        resolve(objects);
    });
};

/* Tokenizes words and detects various classes of words to combine into single entities */
function processWords(pageObject) {
    let sentences = pageObject.sentences;

    let properNounsArray = detectProperNouns(sentences);
    let sentenceWords = properNounsArray.sentenceWords;
    let properNouns = properNounsArray.properNouns;

    sentenceWords = detectNames(sentenceWords);
    sentenceWords = detectHyphenatedWords(sentenceWords);
    sentenceWords = detectURLs(sentenceWords);
    sentenceWords = detectNumbers(sentenceWords);
    return {sentenceWords, properNouns};
}

/* Detects proper nouns by testing if the entities are capitalized throughout the entire article */
function getAllProperNouns(textObject) {
    let article = textObject.article;
    let properNouns = {};
    for(let i = 0; i < article.length; i++) {
        let word = article[i];
        if(!util.isAlpha(word)) continue;
        let currIsLowercase = !util.isUpperCase(word);
        let lowercase = word.toLowerCase();
        let prevIsText = true;
        if(i - 1 >= 0 && !util.isAlphaNum(article[i-1])) {
            prevIsText = false;
        }
        if(!properNouns[lowercase]) {
            properNouns[lowercase] = !currIsLowercase && prevIsText;
        } else {
            if(currIsLowercase) {
                properNouns[lowercase] = false;
            } 
        }
    }
    return properNouns;
}

/* attempts to replace names with title with full name and to replace pronouns
with the names they are referring to */
function detectEquivalentNames(sentences, properNouns) {
    let namesFound = [];

    // first detect names like Mr. Name and replace with full name
    for(let i = 1; i < sentences.length; i++) {
        let curr = sentences[i];
        for(let k = 0; k < curr.length; k++) {
            let word = curr[k];
            word = word.toLowerCase();
            if(util.isNameAsTitle(word)) {
                let lastname = word.split(" ")[1];
                for(let j = 0; j < properNouns.length; j++) {
                    let pn = properNouns[j];
                    let numSpaces = pn.match(/\s/g).length;
                    let pnLastname = pn.split(" ")[numSpaces];
                    if(pnLastname && lastname === pnLastname.toLowerCase()) {
                        sentences[i][k] = pn;
                        namesFound.push(pn);
                        break;
                    }
                }
            }
        }
    }

    // detect where "he" and "she" can be replaced by a full name
    for(let i = 1; i < sentences.length; i++) {
        let curr = sentences[i];
        let firstWord = curr[0].toLowerCase();
        if(firstWord === "he" || firstWord === "she") {
            // start a reverse loop going back up the article
            for(let j = i - 1; j >= 0; j--) {
                let prev = sentences[j];
                let found = false;
                let firstWordOfPrev = prev[0];
                if(util.isProperNoun(firstWordOfPrev)) {
                    sentences[i][0] = firstWordOfPrev;
                    found = true;
                } else {
                    for(let k = 0; k < namesFound.length; k++) {
                        let currName = namesFound[k];
                        if(util.containsWord(prev,currName)) {
                            sentences[i][0] = currName;
                            found = true;
                            break;
                        }
                    }
                }
                if(found)
                    break;
            }
        }
    }
}

/* finds words that are composed of two or more capitalized words to form one entity */
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
                    properNouns.push(compoundWord);
                    words[capsStart] = compoundWord;
                    words.splice(capsStart+1, difference-1);
                    i = i - (difference);
                }
                capsStart = -1;
            }
        }
        sentenceWords.push(words);
    }
    return {sentenceWords,properNouns};
}

/* detect names like Mr. Name in the article to represent as a single entity */
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
                    sentence[i] = word + sentence[i + 1] + " " + sentence[i + 2];
                    sentence.splice(i+1,2);
                    i--;
                }
            }
            sentenceWords[s] = sentence;
        }
    }
    return sentenceWords;
}

/* detect hyphenated words of any length to represent as a single entity */
function detectHyphenatedWords(sentenceWords) {
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            if((i + 1) < sentence.length && sentence[i+1] === "-" && (i+2) < sentence.length) {
                let hyphenated = sentence[i] + sentence[i+1] + sentence[i+2];
                sentence[i] = hyphenated;
                sentence.splice(i+1,2);
                i--;
            }
        }
        sentenceWords[s] = sentence;
    }
    return sentenceWords;
}

/* detect URLs in the article text, like yelp.com to represent as a single entity */
function detectURLs(sentenceWords) {
    let possibleDomains = util.getAllPossibleDomains();
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            let word = sentence[i];
            if((i + 1) < sentence.length && sentence[i+1] === "." && (i+2) < sentence.length) {
                let ending = sentence[i+2];
                let isDomain = possibleDomains.indexOf(ending) > -1;
                if(isDomain) {
                    let link = word + sentence[i+1] + ending;
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

/* detect numbers of any length in the text to represent as a single number */
function detectNumbers(sentenceWords) {
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            let word = sentence[i];
            if((i+1) < sentence.length && sentence[i+1] === "," && (i+1) < sentence.length) {
                let number = word + sentence[i+1] + sentence[i+2];
                sentence[i] = number;
                sentence.splice(i+1, 2);
                i--;
            }
        }
        sentenceWords[s] = sentence;
    }
    return sentenceWords;
}

/* removes punctuation from a sentence if needed (not used in main process) */
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

/* not used - attempt to detect compound nouns, which are words that are not proper nouns but always
appear together, eg. EU referendum */
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

/* not used - tries to use a statistical approach to see how often two words appear together */
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

/* represent the entire article as an array of words and punctuation */
function concatSentences(textObject) {
    let article = [];
    let sentences = textObject.sentenceWordsArray;
    for(let sentence of sentences) {
        article = article.concat(sentence);
    }
    return article;
}

/* get the number of times each word appears in the article */
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

/* get proportion of each word as an initial value for importance */
function getImportances(textObject) {
    let article = textObject.article;
    let freq = textObject.wordFrequencies;

    // normalize article to lower case
    for(let i = 0; i < article.length; i++) {
        article[i] = article[i].toLowerCase();
    }

    let importances = { };
    for(let word in freq) {
        if(util.isNumeric(word)) continue; // if word is a number, skip it
        importances[word] = freq[word] / article.length * 100;
    }
    return importances;
}

/* word weighing based on many different criteria; more steps can be added here */
function adjustTopicWords(textObject, pageObject) {
    let importanceValues = textObject.importanceValues;

    weighHeadline(importanceValues,textObject,pageObject);
    weighSection(importanceValues,pageObject.section);
    weighBolded(importanceValues,textObject,pageObject);
    weighBasedOnLocation(importanceValues,textObject);
    weighStemmedWords(importanceValues,textObject);
    weighProperNames(importanceValues,textObject);
    importanceValues = sortByDescendingImportance(importanceValues);
    // deleteAdjectives(importanceValues);
    // deleteVerbs(importanceValues);

    textObject.importanceValues = importanceValues;
    return textObject;
}

/* gives more weight to proper nouns */
function weighProperNames(importanceValues, textObject) {
    let avg = textObject.importanceAvg;
    let properNounsObject = textObject.properNounsObject;
    for(let word in importanceValues) {
        let type = nlp.text(word).tags()[0][0];
        if(util.isNameAsTitle(word) || word === "bst" || word === "bbc") continue;
        if(type === "Date" || type === "Value" || type === "Demonym") continue;
        if(properNounsObject[word] || util.isProperNoun(word)) {
            importanceValues[word] = (importanceValues[word] + avg*2.5);
        }
    }
}

/* weighs the first half of the article slightly higher */
function weighBasedOnLocation(importanceValues, textObject) {
    let article = textObject.article;
    let avg = textObject.importanceAvg;
    for(let i = 0; i < article.length; i++) {
        article[i] = article[i].toLowerCase();
    }
    for(let word in importanceValues) {
        word = word.toLowerCase();
        let perc = article.indexOf(word)/article.length;
        if(perc < .5) {
            importanceValues[word] = importanceValues[word] + avg*0.75;
        }
    }

    return importanceValues;
}

/* weights words in the headline more */
function weighHeadline(importanceValues,textObject,pageObject) {
    if(!pageObject.headline) return textObject.importanceValues;
    let sentences = textObject.sentenceWordsArray;
    let headline = sentences[0];
    if(!headline) return importanceValues;
    for(let word of headline) {
        word = word.toLowerCase();
        if(util.isStopWord(word)) continue;
        let currImportance = importanceValues[word];
        if(currImportance) {
            importanceValues[word] = importanceValues[word] + textObject.importanceAvg*3;
        }
    }
    return importanceValues;
}

/* weighs the section slightly higher if it exists in the text */
function weighSection(importanceValues, section) {
    section = section.toLowerCase();
    let sectionImportance = importanceValues[section];
    if(sectionImportance) {
        importanceValues[sectionImportance] = importanceValues[section] + 0.5;

    }
    return importanceValues;
}

/* weighs the bolded sentence on BBC articles slightly higher */
function weighBolded(importanceValues,textObject,pageObject) {
    if(!pageObject.bolded) return textObject.importanceValues;
    let sentences = textObject.sentenceWordsArray;
    let bolded  = sentences[1];
    if(sentences.length === 1) bolded = sentences[0];
    for(let word of bolded) {
        word = word.toLowerCase();
        if(util.isStopWord(word)) continue;
        if(!util.isAlphaNum(word)) continue;
        if(importanceValues[word]) {
            importanceValues[word] = importanceValues[word] + textObject.importanceAvg*1.5; // a proportion of avg (as important but not quite)
        }
    }
    return importanceValues;
}

/* gets the average of the importance values */
function getImportanceAverage(importanceValues) {
    let sum = 0;
    let number = 0;
    for(let word in importanceValues) {
        sum += importanceValues[word];
        number++;
    }
    return sum / number;
}

/* stem words using porter stemmer and redistribute weights */
function stemWords(textObject) {
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

/* weighing stemmed words; a main display word gets the the weight of its stems */
function weighStemmedWords(importanceValues,textObject) {
    let stemmed = textObject.stemmedWords;
    for(let stem in stemmed) {
        if(!importanceValues[stem]) continue;
        let totalImportance = 0;
        let related = stemmed[stem];

        if(related.length === 1) continue; // don't bother with calculations since result would equal current importance

        // first add up all importanceValues of each related word and add up frequencies
        for(let i = 0; i < related.length; i++) {
            totalImportance += importanceValues[related[i]];
        }

        // choose which version of stem to keep, taking importanceValues from its related words
        let displayWord = getDisplayWord(textObject,stem);
        importanceValues[displayWord] = totalImportance;
        for(let i = 0; i < related.length; i++) {
            let word = related[i];
            if(word === displayWord) continue;
            delete importanceValues[word];
        }
    }
}

/* sorts the object with the importance values in descending order */
function sortByDescendingImportance(importanceValues) {
    let sorted = [];
    let sortedImportanceValues = {};
    for(let word in importanceValues) {
        sorted.push([word,importanceValues[word]]);
    }
    sorted.sort(function(a,b) {return b[1] - a[1];});
    for(let i = 0; i < sorted.length; i++) {
        sortedImportanceValues[sorted[i][0]] = sorted[i][1];
    }
    return sortedImportanceValues;
}

/* not used - attempts to delete adjectives from the list of importance values */
function deleteAdjectives(importanceValues) {
    let tagger = new pos.Tagger();
    for(let word in importanceValues) {
        let lexer = new pos.Lexer().lex(word);
        let tag = tagger.tag(lexer)[0][1];
        if((tag === "JJ" || tag === "JJR" || tag === "JJS") && !util.isProperNoun(word)) {
            delete importanceValues[word];
        }
    }
}

/* not used - attempts to delete verbs from the list of importance values */
function deleteVerbs(importanceValues) {
    let tagger = new pos.Tagger();
    for(let word in importanceValues) {
        let lexer = new pos.Lexer().lex(word);
        let tag = tagger.tag(lexer)[0][1];
        if((tag === "VBD" || tag === "VBG" || tag === "VBN" || tag === "VBP" || tag === "VBZ") && !util.isProperNoun(word)) {
            delete importanceValues[word];
        }
    }
}

/* for a stemmed word, get the word with the highest importance to represent the stem */
function getDisplayWord(textObject, word) {
    let stemmedWords = textObject.stemmedWords;
    let importanceValues = textObject.importanceValues;
    let relatedWords = stemmedWords[word];
    let displayWord = relatedWords[0];
    let displayWordImportance = importanceValues[displayWord];

    for(let i = 1; i < relatedWords.length; i++) {
        let nextWord = relatedWords[i];
        let nextWordImportance = importanceValues[nextWord];
        if(nextWordImportance > displayWordImportance) {
            displayWord = nextWord;
            displayWordImportance = nextWordImportance;
        }
    }

    return displayWord;
}

/* utility function to extract several indexes from an array to form a single word */
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

/* using part-of-speech tagging libraries, determine some number of topic words from main
importance object  */
function getTopicWords(textObject,num) {
    let topicWords = [];
    let tagger = new pos.Tagger();
    let importanceValues = textObject.importanceValues;
    let goodTags = ["NN","NNP","NNPS","NNS"];
    for(let word in importanceValues) {
        if(topicWords.length >= num) break;
        if(word.indexOf("-") > -1) continue;
        let lexer = new pos.Lexer().lex(word);
        let tag = tagger.tag(lexer)[0][1];
        let type = nlp.text(word).tags()[0][0];
        // console.log(word,tag,type);
        if(word === "bbc" || word === "bbc news") continue;
        if(util.isNameAsTitle(word)) continue;
        if(util.isMonthName(word)) continue;
        let badTypes = (type !== "Date" && type !== "Value" && type !== "Adjective");
        let goodTypes = (type === "Place");
        if(((goodTags.indexOf(tag) >= 0 || goodTypes) && badTypes) || util.isProperNoun(word))
            topicWords.push(word);
    }
    return topicWords;
}

/* converts an array of words into an object with values of one */
function convertToObject(topicWords) {
    let obj = {};
    for(let word of topicWords) {
        obj[word] = 1;
    }
    return obj;
}

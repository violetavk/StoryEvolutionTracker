'use strict';
let natural = require("natural");
let stemmer = require("porter-stemmer").stemmer;
let util = require("./util.js");
let pos = require('pos');
let nlp = require("nlp_compromise");

exports.processText = function(objects) {
    console.log("-- Text Processing (with promise) --");
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

function processWords(pageObject) { // process words to detect certain classes of words
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

function detectEquivalentNames(sentences, properNouns) {
    let namesFound = [];
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

    // console.log("Looking for he/she name matches now");
    for(let i = 1; i < sentences.length; i++) {
        let curr = sentences[i];
        // console.log("Testing--->",curr);
        let firstWord = curr[0].toLowerCase();
        // console.log("First word:",firstWord);
        if(firstWord === "he" || firstWord === "she") {
            // start a reverse loop going back up the article
            // console.log("Found he or she");
            for(let j = i - 1; j >= 0; j--) {
                let prev = sentences[j];
                let found = false;
                // console.log("      One of the prev::::",prev);
                let firstWordOfPrev = prev[0];
                if(util.isProperNoun(firstWordOfPrev)) {
                    // console.log("Found a match:",firstWordOfPrev);
                    sentences[i][0] = firstWordOfPrev;
                    found = true;
                } else {
                    for(let k = 0; k < namesFound.length; k++) {
                        let currName = namesFound[k];
                        if(util.containsWord(prev,currName)) {
                            // console.log("Found a match:",currName);
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
                    // console.log("--------- Found: " + compoundWord);
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

function detectHyphenatedWords(sentenceWords) {
    for(let s = 0; s < sentenceWords.length; s++) {
        let sentence = sentenceWords[s];
        for(let i = 0; i < sentence.length; i++) {
            if((i + 1) < sentence.length && sentence[i+1] === "-" && (i+2) < sentence.length) {
                let hyphenated = sentence[i] + sentence[i+1] + sentence[i+2];
                // console.log("Found hyphenated: " + hyphenated);
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
                    // console.log("Found url: " + link);
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
                // console.log("Found number: " + number);
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

function determineRelatedWords(textObject) {
    let titles = ["Mr", "Mrs", "Ms", "Miss", "Mx", "Dr", "Prof", "Hon", "Rev"];
    let properNouns = textObject.properNouns;
    let locations = [];
    // first split on space
    for(let i = 0; i < properNouns.length; i++) {
        let noun = properNouns[i];
        noun = noun.split(" ");
        properNouns[i] = noun;
    }

    for(let i = 0; i < properNouns.length; i++) {
        let noun = properNouns[i];
        let nounLocations = [];
        for(let j = 0; j < properNouns.length; j++) {
            if(i === j) continue;
            let curr = properNouns[j];
            for(let word of noun) {
                if(titles.indexOf(word) > -1) continue;
                if(curr.indexOf(word) > -1) {
                    nounLocations.push(j);
                }
            }
        }
        locations.push(nounLocations);
    }
    // console.log(properNouns);
    // console.log(locations);
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
    // for(let i = 0; i < article.length; i++) {
    //     article[i] = article[i].toLowerCase();
    // }
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

function getImportances(textObject) {
    let article = textObject.article;
    let freq = textObject.wordFrequencies;

    // normalize article to lower case
    for(let i = 0; i < article.length; i++) {
        article[i] = article[i].toLowerCase();
    }

    let importances = { };
    for(let word in freq) {
        if(util.isNumeric(word)) continue;

        let occ = 0;
        for(let i = 0; i < article.length; i++) {
            if(word === article[i])
                occ++;
        }
        let importance = occ / article.length * 100;
        importances[word] = importance;
    }
    return importances;
}

function adjustTopicWords(textObject, pageObject) {
    // there will be a variety of processes in here
    let importanceValues = textObject.importanceValues;

    weighHeadline(importanceValues,textObject,pageObject);
    weighSection(importanceValues,pageObject.section);
    weighBolded(importanceValues,textObject,pageObject);
    weighBasedOnLocation(importanceValues,textObject);
    weighStemmedWords(importanceValues,textObject);
    weighProperNames(importanceValues,textObject);
    // adjustForNames(importanceValues,textObject);
    importanceValues = sortByDescendingImportance(importanceValues);
    // deleteAdjectives(importanceValues);
    // deleteVerbs(importanceValues);

    textObject.importanceValues = importanceValues;
    return textObject;
}

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

function weighSection(importanceValues, section) {
    section = section.toLowerCase();
    let sectionImportance = importanceValues[section];
    if(sectionImportance) {
        importanceValues[sectionImportance] = importanceValues[section] + 0.5;

    }
    return importanceValues;
}

function weighBolded(importanceValues,textObject,pageObject) {
    if(!pageObject.bolded) return textObject.importanceValues;
    let sentences = textObject.sentenceWordsArray;
    let bolded  = sentences[1];
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

function getImportanceAverage(importanceValues) {
    let sum = 0;
    let number = 0;
    for(let word in importanceValues) {
        sum += importanceValues[word];
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

function weighStemmedWords(importanceValues,textObject) {
    let stemmed = textObject.stemmedWords;
    // let freq = textObject.wordFrequencies;
    for(let stem in stemmed) {
        if(!importanceValues[stem]) continue;
        let totalImportance = 0;
        // let freqSum = 0;
        let related = stemmed[stem];

        if(related.length === 1) continue; // don't bother with calculations since result would equal current importance

        // first add up all importanceValues of each related word and add up frequencies
        for(let i = 0; i < related.length; i++) {
            totalImportance += importanceValues[related[i]];
            // freqSum += freq[related[i]];
        }

        // calculate the denominator for the skewed average result
        // let denominator = related.length === 1 ? 1 : related.length - 1; // -1 is to skew favorably for slightly higher values

        // new importance is dependent on all of its related words, denominator for avg. calculation set by formula above
        // let adjustedImportance = totalImportance / denominator;
        // console.log(stem,"adjusted importance =",adjustedImportance);

        // distribute the new weights based on the frequency of the word
        // for(let i = 0; i < related.length; i++) {
            // let word = related[i];
            // importanceValues[word] = adjustedImportance * (freq[word]/freqSum);

            // importanceValues[word] = importanceValues[word] + (adjustedImportance * (freq[word]/freqSum)); // way too high
            // importanceValues[word] = importanceValues[word] + adjustedImportance;
            // console.log("setting",word,"to",importanceValues[word]);
        // }

        // choose which version of stem to keep, taking importanceValues from its related words
        let displayWord = getDisplayWord(textObject,stem);
        importanceValues[displayWord] = totalImportance;
        for(let i = 0; i < related.length; i++) {
            let word = related[i];
            if(word === displayWord) continue;
            // importanceValues[displayWord] += importanceValues[word];
            delete importanceValues[word];
        }
    }

}

function adjustForNames(importanceValues,textObject) {
    let tagger = new pos.Tagger();
    for(let word in importanceValues) {
        if(util.isNameAsTitle(word)) {
            // console.log("Detected a name:",word);
            let lastName = word.split(" ")[1];

            // find the matching names
            let names = findNameMatches(lastName,word,importanceValues);
            let baseName = names[0];
            let baseImportance = importanceValues[baseName];
            let currImportance = importanceValues[word];
            let maxImportance = baseImportance > currImportance ? baseImportance : currImportance;
            // console.log(word,currImportance);
            // console.log(baseName,baseImportance);
            // console.log("Giving",baseName,"importance of",maxImportance);
            importanceValues[baseName] = maxImportance;
            importanceValues[word] = maxImportance * 0.4;
        } else if(util.isNormalWord(word)) {
            // name is either a first name or last name
            // console.log("testing",word);
            let names = findNameMatches(word,word,importanceValues);
            // console.log("matches:",names);
            if(names.length === 0 || names.length > 1) continue;
            let baseName = names[0];

            // various tests
            let lexer = new pos.Lexer().lex(word);
            let tag = tagger.tag(lexer)[0][1];
            let nlpTag = nlp.text(word).tags()[0][0];
            // console.log(tag,nlpTag);
            if(nlpTag !== "Actor" && nlpTag !== "Person" && nlpTag !== "Place") {
                // console.log("Skipping this one b/c NOT an actor or person");
                continue;
            }
            // console.log(nlp.text(word).tags()[0][0],"-",tag);
            // if(nlp.text(baseName).tags()[0][0] === "")
            if(baseName.indexOf(" ") < 0) continue;
            let baseImportance = importanceValues[baseName];
            let currImportance = importanceValues[word];
            let maxImportance = baseImportance > currImportance ? baseImportance : currImportance;
            importanceValues[baseName] = maxImportance;
            importanceValues[word] = maxImportance * 0.2;
        } else if(util.isProperNoun(word)) {
            // console.log("testing",word);
            let names = findNameMatches(word,word,importanceValues);
            // console.log("matches:",names);
            if(names.length === 0) continue;
            let nameImportance = importanceValues[word] > importanceValues[names[0]] ? importanceValues[word] : importanceValues[names[0]];
            if(word.length < names[0].length) {
                // keep curr, increase its importance to max
                // console.log("Keeping",word,"- setting importance to",nameImportance);
                importanceValues[word] = nameImportance;
                delete importanceValues[names[0]];
            } else {
                // replace with names[0], delete word
                // console.log("Keeping",names[0],"- setting importance to",nameImportance);
                importanceValues[names[0]] = nameImportance;
                delete importanceValues[word];
            }
        }
    }
}

function findNameMatches(name,original,importanceValues) {
    let matches = [];
    for(let word in importanceValues) {
        if(word.indexOf(name) > -1 && word !== original) {
            matches.push(word);
        }
    }
    return matches;
}

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
        console.log(word,tag,type);
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

function convertToObject(topicWords) {
    let obj = {};
    for(let word of topicWords) {
        obj[word] = 1;
    }
    return obj;
}

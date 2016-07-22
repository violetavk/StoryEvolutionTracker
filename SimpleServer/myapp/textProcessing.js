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
        // determineRelatedWords(textObject);
        textObject.article = concatSentences(textObject);
        textObject.wordFrequencies = getWordFrequencies(textObject);
        textObject.tfidfs = getTfIdf(textObject);
        textObject.stemmedWords = stemWords(textObject);
        textObject.tfidfAvg = getTfIdfAverage(textObject.tfidfs);

        textObject = adjustTopicWords(textObject,pageObject);
        textObject.topicWords = getTopicWords(textObject,8);
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
                    sentence[i] = word + sentence[i+1] + " " + sentence[i+2];;
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
    console.log(properNouns);
    console.log(locations);
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
    let tfidfs = textObject.tfidfs;

    weighHeadline(tfidfs,textObject,pageObject);
    weighSection(tfidfs,pageObject.section);
    weighBolded(tfidfs,textObject,pageObject);
    weighBasedOnLocation(tfidfs,textObject);
    weighStemmedWords(tfidfs,textObject);
    adjustForNames(tfidfs,textObject);
    tfidfs = sortTfidfs(tfidfs);
    // deleteAdjectives(tfidfs);
    // deleteVerbs(tfidfs);

    textObject.tfidfs = tfidfs;
    return textObject;
}

function weighBasedOnLocation(tfidfs, textObject) {
    let article = textObject.article;
    let avg = textObject.tfidfAvg;
    for(let word in tfidfs) {
        word = word.toLowerCase();
        let perc = article.indexOf(word)/article.length;
        if(perc < .5) {
            tfidfs[word] = tfidfs[word] + avg*0.75;
        }
    }

    return tfidfs;
}

function weighHeadline(tfidfs,textObject,pageObject) {
    if(!pageObject.headline) return textObject.tfidfs;
    let sentences = textObject.sentenceWordsArray;
    let headline = sentences[0];
    if(!headline) return tfidfs;
    for(let word of headline) {
        word = word.toLowerCase();
        if(util.isStopWord(word)) continue;
        let currTfidf = tfidfs[word];
        if(currTfidf) {
            tfidfs[word] = tfidfs[word] + textObject.tfidfAvg*3; // increase importance of word if it's in headline, avg?
        }
    }
    return tfidfs;
}

function weighSection(tfidfs, section) {
    section = section.toLowerCase();
    let sectionTfidf = tfidfs[section];
    if(sectionTfidf) {
        tfidfs[sectionTfidf] = tfidfs[section] + 0.5;

    }
    return tfidfs;
}

function weighBolded(tfidfs,textObject,pageObject) {
    if(!pageObject.bolded) return textObject.tfidfs;
    let sentences = textObject.sentenceWordsArray;
    let bolded  = sentences[1];
    for(let word of bolded) {
        word = word.toLowerCase();
        if(util.isStopWord(word)) continue;
        if(!util.isAlphaNum(word)) continue;
        if(tfidfs[word]) {
            tfidfs[word] = tfidfs[word] + textObject.tfidfAvg*1.5; // a proportion of avg (as important but not quite)
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

function weighStemmedWords(tfidfs,textObject) {
    let stemmed = textObject.stemmedWords;
    let freq = textObject.wordFrequencies;
    for(let stem in stemmed) {
        if(!tfidfs[stem]) continue;
        let totalTfidf = 0;
        let freqSum = 0;
        let related = stemmed[stem];

        if(related.length === 1) continue; // don't bother with calculations since result would equal current tfidf

        // first add up all tfidfs of each related word and add up frequencies
        for(let i = 0; i < related.length; i++) {
            totalTfidf += tfidfs[related[i]];
            freqSum += freq[related[i]];
        }

        // calculate the denominator for the skewed average result
        let denominator = related.length === 1 ? 1 : related.length - 1; // -1 is to skew favorably for slightly higher values

        // new tfidf is dependent on all of its related words, denominator for avg. calculation set by formula above
        let adjustedTfIdf = totalTfidf / denominator;
        // console.log(stem,"adjusted tfidf =",adjustedTfIdf);

        // distribute the new weights based on the frequency of the word
        for(let i = 0; i < related.length; i++) {
            let word = related[i];
            tfidfs[word] = adjustedTfIdf * (freq[word]/freqSum);

            // tfidfs[word] = tfidfs[word] + (adjustedTfIdf * (freq[word]/freqSum)); // way too high
            // tfidfs[word] = tfidfs[word] + adjustedTfIdf;
            // console.log("setting",word,"to",tfidfs[word]);
        }

        // choose which version of stem to keep, taking tfidfs from its related words
        let displayWord = getDisplayWord(textObject,stem);
        for(let i = 0; i < related.length; i++) {
            let word = related[i];
            if(word === displayWord) continue;
            tfidfs[displayWord] += tfidfs[word];
            delete tfidfs[word];
        }
    }

}

function adjustForNames(tfidfs,textObject) {
    let tagger = new pos.Tagger();
    for(let word in tfidfs) {
        if(util.isNameAsTitle(word)) {
            // console.log("Detected a name:",word);
            let lastName = word.split(" ")[1];

            // find the matching names
            let names = findNameMatches(lastName,word,tfidfs);
            let baseName = names[0];
            let baseTfidf = tfidfs[baseName];
            let currTfidf = tfidfs[word];
            let maxTfidf = baseTfidf > currTfidf ? baseTfidf : currTfidf;
            // console.log(word,currTfidf);
            // console.log(baseName,baseTfidf);
            // console.log("Giving",baseName,"tfidf of",maxTfidf);
            tfidfs[baseName] = maxTfidf;
            tfidfs[word] = maxTfidf * 0.4;
        } else if(util.isNormalWord(word)) {
            // name is either a first name or last name
            // console.log("testing",word);
            let names = findNameMatches(word,word,tfidfs);
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
            console.log(nlp.text(word).tags()[0][0],"-",tag);
            // if(nlp.text(baseName).tags()[0][0] === "")
            if(baseName.indexOf(" ") < 0) continue;
            let baseTfidf = tfidfs[baseName];
            let currTfidf = tfidfs[word];
            let maxTfidf = baseTfidf > currTfidf ? baseTfidf : currTfidf;
            tfidfs[baseName] = maxTfidf;
            tfidfs[word] = maxTfidf * 0.2;
        } else if(util.isProperNoun(word)) {
            // console.log("testing",word);
            let names = findNameMatches(word,word,tfidfs);
            // console.log("matches:",names);
            if(names.length === 0) continue;
            let nameTfidf = tfidfs[word] > tfidfs[names[0]] ? tfidfs[word] : tfidfs[names[0]];
            if(word.length < names[0].length) {
                // keep curr, increase its tfidf to max
                // console.log("Keeping",word,"- setting tfidf to",nameTfidf);
                tfidfs[word] = nameTfidf;
                delete tfidfs[names[0]];
            } else {
                // replace with names[0], delete word
                // console.log("Keeping",names[0],"- setting tfidf to",nameTfidf);
                tfidfs[names[0]] = nameTfidf;
                delete tfidfs[word];
            }
        }
    }
}

function findNameMatches(name,original,tfidfs) {
    let matches = [];
    for(let word in tfidfs) {
        if(word.indexOf(name) > -1 && word !== original) {
            matches.push(word);
        }
    }
    return matches;
}

function sortTfidfs(tfidfs) {
    let sorted = [];
    let sortedTfIdfs = {};
    for(let word in tfidfs) {
        sorted.push([word,tfidfs[word]]);
    }
    sorted.sort(function(a,b) {return b[1] - a[1];});
    for(let i = 0; i < sorted.length; i++) {
        sortedTfIdfs[sorted[i][0]] = sorted[i][1];
    }
    return sortedTfIdfs;
}

function deleteAdjectives(tfidfs) {
    let tagger = new pos.Tagger();
    for(let word in tfidfs) {
        let lexer = new pos.Lexer().lex(word);
        let tag = tagger.tag(lexer)[0][1];
        if((tag === "JJ" || tag === "JJR" || tag === "JJS") && !util.isProperNoun(word)) {
            delete tfidfs[word];
        }
    }
}

function deleteVerbs(tfidfs) {
    let tagger = new pos.Tagger();
    for(let word in tfidfs) {
        let lexer = new pos.Lexer().lex(word);
        let tag = tagger.tag(lexer)[0][1];
        if((tag === "VBD" || tag === "VBG" || tag === "VBN" || tag === "VBP" || tag === "VBZ") && !util.isProperNoun(word)) {
            delete tfidfs[word];
        }
    }
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

function getTopicWords(textObject,num) {
    let topicWords = [];
    let tagger = new pos.Tagger();
    let tfidfs = textObject.tfidfs;
    let goodTags = ["NN","NNP","NNPS","NNS"];
    for(let word in tfidfs) {
        if(topicWords.length >= num) break;
        if(word.indexOf("-") > -1) continue;
        let lexer = new pos.Lexer().lex(word);
        let tag = tagger.tag(lexer)[0][1];
        let type = nlp.text(word).tags()[0][0];
        console.log(word,tag,type);
        if(word === "bbc" || word === "bbc news") continue;
        let badTypes = (type !== "Date" && type !== "Value" && type !== "Adjective");
        let goodTypes = (type === "Place");
        if(((goodTags.indexOf(tag) >= 0 || goodTypes) && badTypes) || util.isProperNoun(word))
            topicWords.push(word);

        // if(util.isProperNoun(word))
        //     topicWords.push(word);
        // else if(type === "Place")
        //     topicWords.push(word);
        // else if(goodTags.indexOf(tag) >= 0 && badTypes)
        //     topicWords.push(word);
        // else if((goodTags.indexOf(tag) >= 0 || tag === "NNS") && type === "Adjective")
        //     topicWords.push(word);

        // if(goodTags.indexOf(tag) >= 0 && badTypes)
        //     topicWords.push(word);
        // else if(type === "Place")
        //     topicWords.push(word);
        // else if(util.isProperNoun(word))
        //     topicWords.push(word);
        // else if((goodTags.indexOf(tag) >= 0 || tag === "NNS") && type === "Adjective")
        //     topicWords.push(word);
    }
    return topicWords;
}

// module.exports = textProcessor;

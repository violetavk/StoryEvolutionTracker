'use strict';
let natural = require("natural");
let stemmer = require("porter-stemmer").stemmer;
let nlp = require('nlp_compromise');

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

    detectCompoundNounsSentence(sentenceWords[0]);
    detectCompoundNounsSentence(sentenceWords[1]);
    
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
            let isAlphaNum = /^[A-Za-z0-9]/.test(word[0]);
            let isUpperCase = (/^[A-Z]+$/.test(word[0]));
            let isstopword = isStopWord(word.toLowerCase());
            if(isUpperCase && isAlphaNum && !isstopword) {
                if(capsStart === -1) {
                    capsStart = i;
                }
            } else if(capsStart !== -1 && isNumeric(word)) {
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
            if(!isAlphaNum(word)) {
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
        if(isStopWord(word.toLowerCase())) continue;
        if(!isAlphaNum(word.toLowerCase())) continue;
        if(i+1 < sentence.length) {
            let followingWord = sentence[i+1];
            let isAlNum = isAlphaNum(followingWord.toLowerCase());
            let stopWord = isStopWord(followingWord.toLowerCase());
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
            if(isStopWord(word.toLowerCase())) continue;
            if(!isAlphaNum(word.toLowerCase())) continue;
            followsMatrix[word] = [];
            if(i + 1 < sentence.length) {
                let followingWord = sentence[i+1];
                if(isStopWord(followingWord)) continue;
                // console.log("After",word," comes ",followingWord);
                let isAlNum = isAlphaNum(followingWord.toLowerCase());
                let stopWord = isStopWord(followingWord.toLowerCase());
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

            if(isStopWord(word)) continue;
            if(!isAlphaNum(word)) continue;

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
        if(isNumeric(word)) continue;

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

    textObject.tfidfs = tfidfs;
    return textObject;
}

function weighHeadline(textObject,pageObject) {
    if(!pageObject.headline) return textObject.tfidfs;
    let tfidfs = textObject.tfidfs;
    let sentences = textObject.sentenceWordsArray;

    let headline = sentences[0];
    if(!headline) return tfidfs;
    for(let word of headline) {
        word = word.toLowerCase();
        if(isStopWord(word)) continue;
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
        if(isStopWord(word)) continue;
        if(!isAlphaNum(word)) continue;
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
            if(isStopWord(word.toLowerCase())) continue;
            if(!isAlphaNum(word.toLowerCase())) continue;

            let isNormal = isNormalWord(word);
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

function isStopWord(word) {
    let stopwords = ["a","ago","about","above","across","after","again","against","all","almost","alone","along","already","also","although","always","among","an","and","another","any","anybody","anyone","anything","anywhere","are","area","areas","around","as","ask","asked","asking","asks","at","away","b","back","backed","backing","backs","be","became","because","become","becomes","been","before","began","behind","being","beings","best","better","between","big","both","but","by","c","came","can","cannot","case","cases","certain","certainly","clear","clearly","come","could","d","did","differ","different","differently","do","does","done","down","down","downed","downing","downs","during","e","each","early","either","end","ended","ending","ends","enough","even","evenly","ever","every","everybody","everyone","everything","everywhere","f","face","faces","fact","facts","far","felt","few","find","finds","first","for","four","from","full","fully","further","furthered","furthering","furthers","g","gave","general","generally","get","gets","give","given","gives","go","going","good","goods","got","great","greater","greatest","group","grouped","grouping","groups","h","had","has","have","having","he","her","here","herself","high","high","high","higher","highest","him","himself","his","how","however","i","if","important","in","interest","interested","interesting","interests","into","is","it","its","itself","j","just","k","keep","keeps","kind","knew","know","known","knows","l","large","largely","last","later","latest","least","less","let","lets","likely","long","longer","longest","m","made","make","making","man","many","may","me","member","members","men","might","more","most","mostly","much","must","my","myself","n","necessary","need","needed","needing","needs","never","newer","newest","next","no","nobody","non","noone","not","nothing","now","nowhere","number","numbers","o","of","off","often","old","older","oldest","on","once","one","only","open","opened","opening","opens","or","order","ordered","ordering","orders","other","others","our","out","over","p","part","parted","parting","parts","per","perhaps","place","places","point","pointed","pointing","points","possible","present","presented","presenting","presents","problem","problems","put","puts","q","quite","r","rather","really","right","right","room","rooms","s","said","same","saw","say","says","second","seconds","see","seem","seemed","seeming","seems","sees","several","shall","she","should","show","showed","showing","shows","side","sides","since","small","smaller","smallest","so","some","somebody","someone","something","somewhere","state","states","still","still","such","sure","t","take","taken","than","that","the","their","them","then","there","therefore","these","they","thing","things","think","thinks","this","those","though","thought","thoughts","three","through","thus","to","today","together","too","took","toward","turn","turned","turning","turns","two","u","under","until","up","upon","us","use","used","uses","v","very","w","want","wanted","wanting","wants","was","way","ways","we","well","wells","went","were","what","when","where","whether","which","while","who","whole","whose","why","will","with","within","without","work","worked","working","works","would","x","y","year","years","yet","you","young","younger","youngest","your","yours","z"]

    if(stopwords.indexOf(word) > -1)
        return true;
    else
        return false;
}

function isAlphaNum(word) {
    return /^[A-Za-z0-9]/.test(word[0]);
}

function isNumeric(word) {
    return /^[0-9]/.test(word[0]);
}

function isNormalWord(word) {
    let isAlphaNum = /^[A-Za-z0-9]/.test(word[0]);
    let hasNoSpace = word.indexOf(" ") < 0;
    let hasNoHyphen = word.indexOf("-") < 0;
    let hasNoComma = word.indexOf(",") < 0;
    if(isAlphaNum && hasNoSpace && hasNoHyphen && hasNoComma)
        return true;
    else
        return false;
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

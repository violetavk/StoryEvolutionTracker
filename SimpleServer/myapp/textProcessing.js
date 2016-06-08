'use strict';
let natural = require("natural");
let stemmer = require("porter-stemmer").stemmer;
let nlp = require('nlp_compromise');

let textProcessor = function(pageObject) {
    console.log("-- Text Processing --");
    let textObject = {};
    textObject.sentenceWordsArray = processWords(pageObject);
    textObject.article = concatSentences(textObject);
    textObject.wordFrequencies = getWordFrequencies(textObject);
    textObject.tfidfs = getTfIdf(pageObject, textObject);
    textObject.stemmedWords = stemWords(textObject);

    textObject.sentenceTfIdfs = getSentenceTfIdfs(textObject.sentenceWordsArray,textObject.tfidfs);
    textObject.topSentences = getTopNSentences(textObject.sentenceTfIdfs, pageObject, 3);

    // textObject.stemmedWords = getWordRoots(textObject);
    // textObject.stemmedWords = getStemmedTfIdfs(textObject,pageObject.article);
    // textObject.tfidfsNew = getCondensedTfidfs(textObject);    
    
    // textObject.importantWords = getTopNImportantWords(textObject, 8);
    return textObject;
};

function processWords(pageObject) {
    let sentences = pageObject.sentences;
    
    // process words of each sentence to detect certain classes of words
    let sentenceWords = detectCompoundNouns(sentences);
    sentenceWords = detectNames(sentenceWords);
    sentenceWords = detectHyphenatedWords(sentenceWords);
    sentenceWords = detectURLs(sentenceWords);
    sentenceWords = detectNumbers(sentenceWords);
    sentenceWords = removePunctuation(sentenceWords);
    
    return sentenceWords;
}

function detectCompoundNouns(sentences) {
    let sentenceWords = [];
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
            } else {
                let difference = i - capsStart;
                if(capsStart !== -1 && difference > 1) {
                    let compoundWord = getWordFromArray(capsStart, i-1, words);
                    console.log("--------- Found: " + compoundWord);
                    words[capsStart] = compoundWord;
                    words.splice(capsStart+1, difference-1);
                    i--;
                }   
                capsStart = -1;
            }
        }
        sentenceWords.push(words);
    }
    return sentenceWords;
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

function concatSentences(textObject) {
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

function getWordRoots(textObject) {
    let sentences = textObject.sentenceWordsArray;
    let stemmed = {};

    for(let sentence of sentences) {
        for(let word of sentence) {
            word = word.toLowerCase();

            if(isStopWord(word)) continue;
            if(!isAlphaNum(word)) continue;

            let stemmedWord = word;
            if(isNormalWord(word)) {
                // stemmedWord = stemmer(word); // stem word only if a normal word, not a name, hyphenated, etc.
                stemmedWord = nlp.text(stemmedWord).root(); // getting human-readable root of word
            }
            if(!(stemmedWord in stemmed)) {
                stemmed[stemmedWord] = {}; // will hold list and total tf-idf
                stemmed[stemmedWord].list = {}; // list of related words is an object list
                stemmed[stemmedWord].list[word] = {}; // for tf-idf's and such
            } else {
                // if(stemmed[stemmedWord].list.indexOf(word) < 0)
                //     stemmed[stemmedWord].list.push(word);
                if(!(word in stemmed[stemmedWord].list)) {
                    stemmed[stemmedWord].list[word] = {};
                }
            }
        }
    }

    return stemmed;
}

function getStemmedTfIdfs(textObject, article) { // would be textObject.stemmed
    let stemmed = textObject.stemmedWords;
    let tfidf = new natural.TfIdf();
    tfidf.addDocument(article);

    for(let stem in stemmed) {
        console.log(stem);
        let totalTfidf = 0;
        let obj = stemmed[stem].list;
        for(let word in obj) {
            // console.log("    " + word);
            tfidf.tfidfs(word,function(i,measure) {
                // console.log("      measure: " + measure);
                stemmed[stem].list[word].tfidf = measure;
                totalTfidf += measure;
            });
        }
        stemmed[stem].totalTfidf = totalTfidf;
    }
    console.log(stemmed);
    return stemmed;
}

function getCondensedTfidfs(textObject) {
    let tfidfs = {};
    let stemmed = textObject.stemmedWords;
    for(let stem in stemmed) {
        // console.log(stemmed[stem].totalTfidf);
        tfidfs[stem] = stemmed[stem].totalTfidf;
    }
    return tfidfs;
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

function getTfIdf(pageObject, textObject) {
    let tfidf = new natural.TfIdf();
    let article = textObject.article;
    let freq = textObject.wordFrequencies;

    tfidf.addDocument(article);
    console.log(article);

    let tfidfs = { };
    for(let word in freq) {
        if(isNumeric(word)) continue;
        // tfidf.tfidfs(word,function(i, measure) {
        //     tfidfs[word] = measure;
        // });
        let toTest = [];
        toTest.push(word);
        tfidfs[word] = tfidf.tfidf(toTest, 0);
    }
    return tfidfs;
}

function isStopWord(word) {
    let stopwords = ["a","about","above","across","after","again","against","all","almost","alone","along","already","also","although","always","among","an","and","another","any","anybody","anyone","anything","anywhere","are","area","areas","around","as","ask","asked","asking","asks","at","away","b","back","backed","backing","backs","be","became","because","become","becomes","been","before","began","behind","being","beings","best","better","between","big","both","but","by","c","came","can","cannot","case","cases","certain","certainly","clear","clearly","come","could","d","did","differ","different","differently","do","does","done","down","down","downed","downing","downs","during","e","each","early","either","end","ended","ending","ends","enough","even","evenly","ever","every","everybody","everyone","everything","everywhere","f","face","faces","fact","facts","far","felt","few","find","finds","first","for","four","from","full","fully","further","furthered","furthering","furthers","g","gave","general","generally","get","gets","give","given","gives","go","going","good","goods","got","great","greater","greatest","group","grouped","grouping","groups","h","had","has","have","having","he","her","here","herself","high","high","high","higher","highest","him","himself","his","how","however","i","if","important","in","interest","interested","interesting","interests","into","is","it","its","itself","j","just","k","keep","keeps","kind","knew","know","known","knows","l","large","largely","last","later","latest","least","less","let","lets","likely","long","longer","longest","m","made","make","making","man","many","may","me","member","members","men","might","more","most","mostly","much","must","my","myself","n","necessary","need","needed","needing","needs","never","newer","newest","next","no","nobody","non","noone","not","nothing","now","nowhere","number","numbers","o","of","off","often","old","older","oldest","on","once","one","only","open","opened","opening","opens","or","order","ordered","ordering","orders","other","others","our","out","over","p","part","parted","parting","parts","per","perhaps","place","places","point","pointed","pointing","points","possible","present","presented","presenting","presents","problem","problems","put","puts","q","quite","r","rather","really","right","right","room","rooms","s","said","same","saw","say","says","second","seconds","see","seem","seemed","seeming","seems","sees","several","shall","she","should","show","showed","showing","shows","side","sides","since","small","smaller","smallest","so","some","somebody","someone","something","somewhere","state","states","still","still","such","sure","t","take","taken","than","that","the","their","them","then","there","therefore","these","they","thing","things","think","thinks","this","those","though","thought","thoughts","three","through","thus","to","today","together","too","took","toward","turn","turned","turning","turns","two","u","under","until","up","upon","us","use","used","uses","v","very","w","want","wanted","wanting","wants","was","way","ways","we","well","wells","went","were","what","when","where","whether","which","while","who","whole","whose","why","will","with","within","without","work","worked","working","works","would","x","y","year","years","yet","you","young","younger","youngest","your","yours","z"]

    if(stopwords.indexOf(word) > -1)
        return true;
    else
        return false;
}

function stemWords(textObject) {
    // let freq = textObject.wordFrequencies;
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

function getTopNImportantWords(textObject, num) {
    let imp = {};

    // take all tf-idfs and return sorted array, in decreasing order
    let sortable = [];
    let tfidfs = textObject.tfidfs;
    for (let word in tfidfs)
          sortable.push([word, tfidfs[word]]);
    sortable.sort(function(a, b) {return b[1] - a[1]});

    // now get the top n words, as specified by the argument
    for(let i = 0; i < num && !(i >= sortable.length); i++) {
        let curr = sortable[i];
        imp[curr[0]] = curr[1];
    }
    return imp;
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
        values.push([i, sentence, sentenceValue]);
    }
    values.sort(function(a,b) {return b[2] - a[2]});
    return values;
}

function getTopNSentences(sentenceTfIdfs, pageObject, n) {
    let actualSentences = pageObject.sentences;
    let topSentences = [];
    for(let i = 0; i < n && i < actualSentences.length; i++) {
        let tfIdfSentence = sentenceTfIdfs[i];
        let id = tfIdfSentence[0];
        topSentences.push(actualSentences[id]);
    }
    return topSentences;
}

module.exports = textProcessor;

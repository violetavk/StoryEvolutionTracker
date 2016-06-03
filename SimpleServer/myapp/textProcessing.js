'use strict';
let natural = require("natural");
let stemmer = require("porter-stemmer").stemmer;

let textProcessor = function(pageObject) {
    console.log("-- Text Processing --");
    let textObject = {};
    textObject.sentenceWordsArray = processWords(pageObject);
    textObject.wordFrequencies = getWordFrequencies(pageObject);
    textObject.stemmedWords = stemWords(textObject);
    textObject.tfidfs = getTfIdf(pageObject, textObject);
    textObject.importantWords = getTopNImportantWords(textObject, 8);
    return textObject;
};

function processWords(pageObject) {
    let sentences = pageObject.sentences;
    let sentenceWords = detectCompoundNouns(sentences);

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

function detectPeople(sentenceWords) {
    
}

function getWordFrequencies(pageObject) {
    let freq = {};
    let wordTokenizer = new natural.WordTokenizer();

    if(pageObject.bolded !== null) {
        let resp = sentenceWordFrequency(pageObject.bolded, freq, wordTokenizer);
        freq = resp;
    }

    let sentences = pageObject.sentences;
    for(let s of sentences) {
        let resp = sentenceWordFrequency(s, freq, wordTokenizer);
        freq = resp;
    }

    // freq = removeStopWords(freq);
    // freq = stemWords(freq);
    
    return freq;
}

function sentenceWordFrequency(str, freq, wordTokenizer) {
    // str = str.toLowerCase();
    let words = wordTokenizer.tokenize(str);

    // determine which words should remain together
    // consider ["The","Queen", "visits", "New York City"]
    // --> the tokenization should be ["The","Queen","visits","New York City"]
    // for now, only consider capitalization as 

    // let capsStart = -1;
    // for(let i = 0; i < words.length; i++) {
    //     let word = words[i];
    //     // let isUpperCase = !(/^[a-z0-9]+$/.test(word[0]));
    //     let isAlphaNum = /^[A-Za-z0-9]/.test(word[0]);
    //     let isUpperCase = (/^[A-Z]+$/.test(word[0]));
    //     console.log("processing " + word + ", is upper case = " + isUpperCase);
    //     if(isUpperCase) {
    //         if(capsStart === -1)
    //             capsStart = i;
    //     } else {
    //         let difference = i - capsStart;
    //         if(capsStart !== -1 && difference > 1) {
    //             let compoundWord = getWordFromArray(capsStart, i-1, words);
    //             console.log("Think there's a word starting at " + words[capsStart] + " to " + words[i-1]);
    //             console.log("Word is: " + compoundWord);
    //         }   
    //         capsStart = -1;
    //     }
    // }

    // // remove stop words here first, to prevent words like "The" showing up as part of word
    // for(let i = 0; i < words.length; i++) {
    //     let word = words[i].toLowerCase();
    //     if(isStopWord(word)) {
    //         words.splice(i, 1);
    //         i--;
    //     } 
    // }

    // calculate frequency
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
    let temp = "JP Morgan";
    tfidf.tfidfs(temp,function(i,measure) {
        console.log("--- tf-idf for "+ temp +" ---");
        console.log("measure: " + measure);
        console.log("---------------------------------------");
    });

    for(let word in freq) {
        tfidf.tfidfs(word,function(i, measure) {
            tfidfs[word] = measure;
        });
    }
    return tfidfs;
}

function removeStopWords(freq) {
    // thanks to the list at http://www.lextek.com/manuals/onix/stopwords1.html
    let stopwords = ["a","about","above","across","after","again","against","all","almost","alone","along","already","also","although","always","among","an","and","another","any","anybody","anyone","anything","anywhere","are","area","areas","around","as","ask","asked","asking","asks","at","away","b","back","backed","backing","backs","be","became","because","become","becomes","been","before","began","behind","being","beings","best","better","between","big","both","but","by","c","came","can","cannot","case","cases","certain","certainly","clear","clearly","come","could","d","did","differ","different","differently","do","does","done","down","down","downed","downing","downs","during","e","each","early","either","end","ended","ending","ends","enough","even","evenly","ever","every","everybody","everyone","everything","everywhere","f","face","faces","fact","facts","far","felt","few","find","finds","first","for","four","from","full","fully","further","furthered","furthering","furthers","g","gave","general","generally","get","gets","give","given","gives","go","going","good","goods","got","great","greater","greatest","group","grouped","grouping","groups","h","had","has","have","having","he","her","here","herself","high","high","high","higher","highest","him","himself","his","how","however","i","if","important","in","interest","interested","interesting","interests","into","is","it","its","itself","j","just","k","keep","keeps","kind","knew","know","known","knows","l","large","largely","last","later","latest","least","less","let","lets","likely","long","longer","longest","m","made","make","making","man","many","may","me","member","members","men","might","more","most","mostly","much","must","my","myself","n","necessary","need","needed","needing","needs","never","newer","newest","next","no","nobody","non","noone","not","nothing","now","nowhere","number","numbers","o","of","off","often","old","older","oldest","on","once","one","only","open","opened","opening","opens","or","order","ordered","ordering","orders","other","others","our","out","over","p","part","parted","parting","parts","per","perhaps","place","places","point","pointed","pointing","points","possible","present","presented","presenting","presents","problem","problems","put","puts","q","quite","r","rather","really","right","right","room","rooms","s","said","same","saw","say","says","second","seconds","see","seem","seemed","seeming","seems","sees","several","shall","she","should","show","showed","showing","shows","side","sides","since","small","smaller","smallest","so","some","somebody","someone","something","somewhere","state","states","still","still","such","sure","t","take","taken","than","that","the","their","them","then","there","therefore","these","they","thing","things","think","thinks","this","those","though","thought","thoughts","three","through","thus","to","today","together","too","took","toward","turn","turned","turning","turns","two","u","under","until","up","upon","us","use","used","uses","v","very","w","want","wanted","wanting","wants","was","way","ways","we","well","wells","went","were","what","when","where","whether","which","while","who","whole","whose","why","will","with","within","without","work","worked","working","works","would","x","y","year","years","yet","you","young","younger","youngest","your","yours","z"]
    for(let word in freq) {
        if(stopwords.indexOf(word) > 0) {
            delete freq[word];
        } 
    }
    return freq;
}

function isStopWord(word) {
    let stopwords = ["a","about","above","across","after","again","against","all","almost","alone","along","already","also","although","always","among","an","and","another","any","anybody","anyone","anything","anywhere","are","area","areas","around","as","ask","asked","asking","asks","at","away","b","back","backed","backing","backs","be","became","because","become","becomes","been","before","began","behind","being","beings","best","better","between","big","both","but","by","c","came","can","cannot","case","cases","certain","certainly","clear","clearly","come","could","d","did","differ","different","differently","do","does","done","down","down","downed","downing","downs","during","e","each","early","either","end","ended","ending","ends","enough","even","evenly","ever","every","everybody","everyone","everything","everywhere","f","face","faces","fact","facts","far","felt","few","find","finds","first","for","four","from","full","fully","further","furthered","furthering","furthers","g","gave","general","generally","get","gets","give","given","gives","go","going","good","goods","got","great","greater","greatest","group","grouped","grouping","groups","h","had","has","have","having","he","her","here","herself","high","high","high","higher","highest","him","himself","his","how","however","i","if","important","in","interest","interested","interesting","interests","into","is","it","its","itself","j","just","k","keep","keeps","kind","knew","know","known","knows","l","large","largely","last","later","latest","least","less","let","lets","likely","long","longer","longest","m","made","make","making","man","many","may","me","member","members","men","might","more","most","mostly","much","must","my","myself","n","necessary","need","needed","needing","needs","never","newer","newest","next","no","nobody","non","noone","not","nothing","now","nowhere","number","numbers","o","of","off","often","old","older","oldest","on","once","one","only","open","opened","opening","opens","or","order","ordered","ordering","orders","other","others","our","out","over","p","part","parted","parting","parts","per","perhaps","place","places","point","pointed","pointing","points","possible","present","presented","presenting","presents","problem","problems","put","puts","q","quite","r","rather","really","right","right","room","rooms","s","said","same","saw","say","says","second","seconds","see","seem","seemed","seeming","seems","sees","several","shall","she","should","show","showed","showing","shows","side","sides","since","small","smaller","smallest","so","some","somebody","someone","something","somewhere","state","states","still","still","such","sure","t","take","taken","than","that","the","their","them","then","there","therefore","these","they","thing","things","think","thinks","this","those","though","thought","thoughts","three","through","thus","to","today","together","too","took","toward","turn","turned","turning","turns","two","u","under","until","up","upon","us","use","used","uses","v","very","w","want","wanted","wanting","wants","was","way","ways","we","well","wells","went","were","what","when","where","whether","which","while","who","whole","whose","why","will","with","within","without","work","worked","working","works","would","x","y","year","years","yet","you","young","younger","youngest","your","yours","z"]

    if(stopwords.indexOf(word) > -1)
        return true;
    else
        return false;
}

function stemWords(textObject) {
    let freq = textObject.wordFrequencies;
    let stemmed = {};
    for(let word in freq) {
        let stemmedWord = stemmer(word);
        if(!(stemmedWord in stemmed)) {
            stemmed[stemmedWord] = [];
            stemmed[stemmedWord].push(word);
        } else {
            stemmed[stemmedWord].push(word);
        }
    }
    return stemmed;
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

module.exports = textProcessor;

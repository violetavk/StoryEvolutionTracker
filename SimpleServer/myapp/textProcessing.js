'use strict';
let natural = require("natural");
let stemmer = require("porter-stemmer").stemmer;

let textProcessor = function(pageObject) {
    console.log("-- Text Processing --");
    let textObject = getWordFrequencies(pageObject);
    textObject.stemmedWords = stemWords(textObject);
    textObject.tfidfs = getTfIdf(pageObject, textObject);
    textObject.importantWords = getTopNImportantWords(textObject, 8);
    return textObject;
};

function getWordFrequencies(pageObject) {
    let textObject = {};
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

    freq = removeStopWords(freq);
    // freq = stemWords(freq);
    
    textObject.wordFrequencies = freq;
    return textObject;
}

function sentenceWordFrequency(str, freq, wordTokenizer) {
    let nounInflector = new natural.NounInflector();
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

function removeStopWords(freq) {
    // thanks to the list at http://xpo6.com/list-of-english-stop-words/
    let stopwords = ["a", "about", "above", "above", "across", "after", "afterwards", "again", "against", "all", "almost", "alone", "along", "already", "also","although","always","am","among", "amongst", "amoungst", "amount",  "an", "and", "another", "any","anyhow","anyone","anything","anyway", "anywhere", "are", "around", "as",  "at", "back","be","became", "because","become","becomes", "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides", "between", "beyond", "bill", "both", "bottom","but", "by", "call", "can", "cannot", "cant", "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", "done", "down", "due", "during", "each", "eg", "eight", "either", "eleven","else", "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except", "few", "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former", "formerly", "forty", "found", "four", "from", "front", "full", "further", "get", "give", "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his", "how", "however", "hundred", "ie", "if", "in", "inc", "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own","part", "per", "perhaps", "please", "put", "rather", "re", "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", "she", "should", "show", "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone", "something", "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten", "than", "that", "the", "their", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "therefore", "therein", "thereupon", "these", "they", "thickv", "thin", "third", "this", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward", "towards", "twelve", "twenty", "two", "un", "under", "until", "up", "upon", "us", "very", "via", "was", "we", "well", "were", "what", "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", "with", "within", "without", "would", "yet", "you", "your", "yours", "yourself", "yourselves", "the"];
    for(let word in freq) {
        if(stopwords.indexOf(word) > 0) {
            delete freq[word];
        } 
    }
    return freq;
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

module.exports = textProcessor;

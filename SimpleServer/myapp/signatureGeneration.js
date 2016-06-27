'use strict';
let util = require("./util.js");
let pos = require('pos');

exports.generateSignatures = function(objects) {
    console.log("-- Generating Signatures --");
    return new Promise(function(resolve,reject) {
        let signatures = {};
        let pageObject = objects[2];
        let textObject = objects[3];

        // signatures.topicWord = getMainTopicWord(textObject.tfidfs);
        signatures.sentenceTfIdfs = getSentenceTfIdfs(textObject.sentenceWordsArray,textObject.tfidfs);
        signatures.topSentences = getTopNSentences(signatures.sentenceTfIdfs, pageObject, 3);
        signatures.taggedSentences = tagSentences(signatures.topSentences);
        signatures.adjustedSentences = adjustSentences(signatures,textObject);
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

function adjustSentences(signatures,textObject) {
    // testing with only first sentence for now
    let top = signatures.topSentences;
    let tfidfs = textObject.tfidfs;
    let tagged = signatures.taggedSentences;

    tagged = removeBlacklistWords(tagged);
    tagged = removePastParticiples(tagged);
    tagged = removePossessives(tagged);
    tagged = removeAdjectives(tagged);
    // removeClausePhrases(top);
    tagged = fixFormat(tagged);

    return tagged;
}

function tagSentences(sentences) {
    let tagged = [];
    for(let i = 0; i < sentences.length; i++) {
        let sentence = sentences[i];
        let taggedSentence = [];
        for(let j = 0; j < sentence.length; j++) {
            let word = sentence[j];
            let lexer = new pos.Lexer().lex(word);
            let tagger = new pos.Tagger();
            let tag = tagger.tag(lexer)[0];
            taggedSentence.push([word,tag[1]]);
        }
        tagged.push(taggedSentence);
    }
    return tagged;
}

function removeBlacklistWords(tagged) {
    for(let i = 0; i < tagged.length; i++) {
        let sentence = tagged[i];
        for(let j = 0; j < sentence.length; j++) {
            if(isOnBlacklist(sentence[j][0])) {
                sentence.splice(j,1);
                j--;
            }
        }
        tagged[i] = sentence;
    }
    return tagged;
}

function removePastParticiples(tagged) {
    let pastParticiples = {had:"had",done:"did",said:"said",gone:"went",got:"got",gotten:"got",made:"made",known:"knew", thought:"thought",taken:"took",seen:"saw",come:"came",wanted:"wanted",used:"used",found:"found",given:"gave",told:"told", worked:"worked",called:"called",tried:"tried",asked:"asked",needed:"needed",felt:"felt",become:"became",left:"left",voted:"voted",managed:"managed",put:"put",meant:"meant",kept:"kept",let:"let",begun:"began",seemed:"seemed",helped:"helped",shown:"showed",heard:"heard",played:"played",run:"ran",moved:"moved",lived:"lived",believed:"believed",brought:"brought",happened:"happened",written:"wrote",sat:"sat",stood:"stood",lost:"lost",paid:"paid",met:"met",included:"included",continued:"continued",set:"set",learnt:"learnt",learned:"learned",changed:"changed",led:"led",understood:"understood",watched:"watched",followed:"followed",stopped:"stopped",created:"created",spoken:"spoke",read:"read",spent:"spent",grown:"grew",opened:"opened",walked:"walked",won:"won",taught:"taught",offered:"offered",remembered:"remembered",considered:"considered",appeared:"appeared",bought:"bought",served:"served",died:"died",sent:"sent",built:"built",stayed:"stayed",fallen:"fell",cut:"cut",reached:"reached",killed:"killed",raised:"raised",passed:"passed",sold:"sold",decided:"decided",returned:"returned",explained:"explained",hoped:"hoped",developed:"developed",carried:"carried",broken:"broke",received:"received",agreed:"agreed",supported:"supported",hit:"hit",produced:"produced",eaten:"ate",covered:"covered",caught:"caught",drawn:"drew",chosen:"chose"};
    for(let i = 0; i < tagged.length; i++) {
        let sentence = tagged[i];
        for(let j = 0; j < sentence.length; j++) {
            let word = sentence[j][0];
            if(word === "have" || word === "has" && (j + 1) < sentence.length) {
                // test if in past participle tense, eg "have broken"
                let nextWord = sentence[j+1][0];
                if(nextWord in pastParticiples) {
                    sentence[j][0] = pastParticiples[nextWord];
                    sentence.splice(j+1,1);
                }
            }
        }
        tagged[i] = sentence;
    }
    return tagged;
}

function removePossessives(tagged) {
    for(let i = 0; i < tagged.length; i++) {
        let sentence = tagged[i];
        for(let j = 0; j < sentence.length; j++) {
            let pair = sentence[j];
            let word = pair[0];
            let tag = pair[1];
            if(tag === "PP$" || tag === "PRP$") {
                console.log("Found possessive:",word);
                sentence.splice(j,1);
                j--;
            }
        }
        tagged[i] = sentence;
    }
    return tagged;
}

function removeAdjectives(tagged) {
    for(let i = 0; i < tagged.length; i++) {
        let sentence = tagged[i];
        for(let j = 0; j < sentence.length; j++) {
            let pair = sentence[j];
            let word = pair[0];
            let tag = pair[1];
            if((tag === "JJ" || tag === "JJR" || tag === "JJS") && !util.isProperNoun(word)) {
                sentence.splice(j,1);
                j--;
            }
        }
        tagged[i] = sentence;
    }
    return tagged;
}

function removeClausePhrases(sentences) {

}

function fixFormat(tagged) {
    for(let i = 0; i < tagged.length; i++) {
        let sentence = tagged[i];
        let firstWord = sentence[0][0];
        firstWord = firstWord[0].toUpperCase() + firstWord.substring(1);
        sentence[0][0] = firstWord;
        tagged[i] = sentence;
    }

    return tagged;
}

function getPlainSignature(signatures) {
    // let topSentences = signatures.topSentences;
    let topSentences = signatures.adjustedSentences;
    let signature = "";

    for(let i = 0; i < topSentences.length; i++) {
        let sentence = "";
        let curr = topSentences[i];
        let insideQuotes = false;
        for(let j = 0; j < curr.length; j++) {
            let word = curr[j][0].trim();
            sentence += word;

            // test whether to add space
            if(j+1 >= curr.length) continue;
            let nextWord = curr[j+1][0].trim();

            if(util.isAlpha(word) && util.isNumeric(nextWord)) {
                sentence += " ";
            }
            else if(nextWord === "." || nextWord === "," || nextWord === "'" || util.isNumeric(nextWord) || (word === "\"" && insideQuotes) || (word === "'" && util.isAlphaNum(nextWord))) {
                // just continue
            }
            else if(nextWord === "\"" && !insideQuotes) {
                insideQuotes = true;
                sentence += " ";
            }
            else if(nextWord === "\"" && insideQuotes) {
                insideQuotes = false;
            }
            else {
                sentence += " ";
            }
        }

        signature += (sentence + " ");
    }

    return signature;
}

function isOnBlacklist(word) {
    let blacklist = ["the","an","a"];
    return (blacklist.indexOf(word.toLowerCase().trim()) > -1);
}

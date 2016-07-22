'use strict';
let util = require("./util.js");
let pos = require('pos');

exports.generateSignatures = function(objects) {
    console.log("-- Generating Signatures --");
    return new Promise(function(resolve,reject) {
        let signatures = {};
        let pageObject = objects.pageObject;
        let textObject = objects.textObject;

        // signatures.topicWord = getMainTopicWord(textObject.tfidfs);
        signatures.sentenceTfIdfs = getSentenceTfIdfs(textObject.sentenceWordsArray,textObject.tfidfs);
        signatures.topSentences = getTopNSentences(signatures.sentenceTfIdfs, pageObject, 2);
        signatures.taggedSentences = tagSentences(signatures.topSentences);
        signatures.adjustedSentences = adjustSentences(signatures,textObject);
        signatures.plainSignature = getPlainSignature(signatures);
        objects.signatures = signatures;
        resolve(objects);
    });
};

function getTopNWords(textObject,n) {
    let tfidfs = textObject.tfidfs;
    let top = {};
    let count = 0;
    for(let word in tfidfs) {
        if(count < n) {
            top[word] = tfidfs[word];
            count++;
        } else break;
    }

    return top;
}

function getSentenceTfIdfs(sentences, tfidfs) {
    let values = [];
    let tagger = new pos.Tagger();
    for(let i = 0; i < sentences.length; i++) {
        let sentenceValue = 0;
        let sentence = sentences[i];
        for(let word of sentence) {
            let curr = tfidfs[word.toLowerCase()];
            if(curr) {
                let lexer = new pos.Lexer().lex(word);
                let tag = tagger.tag(lexer)[0][1];
                if((tag === "JJ" || tag === "JJR" || tag === "JJS") && !util.isProperNoun(word))
                    sentenceValue += 0; // if adjective, do not weigh
                else
                    sentenceValue += curr;
            }
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
    let tfidfs = textObject.tfidfs;
    let avg = textObject.tfidfAvg;
    let tagged = signatures.taggedSentences;

    // tagged = removeAdjectives(tagged,textObject);
    tagged = removeBlacklistWords(tagged);
    tagged = removePastParticiples(tagged);
    tagged = removePossessives(tagged);
    removeOtherPhrases(tagged,textObject);
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
    // console.log(tagged);
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
    let pastParticiples = {rejected:"rejected",removed:"removed",had:"had",done:"did",said:"said",gone:"go",got:"got",gotten:"got",made:"made",known:"knew", thought:"thought",taken:"took",seen:"saw",come:"came",wanted:"wanted",used:"used",found:"found",given:"gave",told:"told", worked:"worked",called:"called",tried:"tried",asked:"asked",needed:"needed",felt:"felt",become:"became",left:"left",voted:"voted",managed:"managed",put:"put",meant:"meant",kept:"kept",let:"let",begun:"began",seemed:"seemed",helped:"helped",shown:"showed",heard:"heard",played:"played",run:"ran",moved:"moved",lived:"lived",believed:"believed",brought:"brought",happened:"happened",written:"wrote",sat:"sat",stood:"stood",lost:"lost",paid:"paid",met:"met",included:"included",continued:"continued",set:"set",learnt:"learnt",learned:"learned",changed:"changed",led:"led",understood:"understood",watched:"watched",followed:"followed",stopped:"stopped",created:"created",spoken:"spoke",read:"read",spent:"spent",grown:"grew",opened:"opened",walked:"walked",won:"won",taught:"taught",offered:"offered",remembered:"remembered",considered:"considered",appeared:"appeared",bought:"bought",served:"served",died:"died",sent:"sent",built:"built",stayed:"stayed",fallen:"fell",cut:"cut",reached:"reached",killed:"killed",raised:"raised",passed:"passed",sold:"sold",decided:"decided",returned:"returned",explained:"explained",hoped:"hoped",developed:"developed",carried:"carried",broken:"broke",received:"received",agreed:"agreed",supported:"supported",hit:"hit",produced:"produced",eaten:"ate",covered:"covered",caught:"caught",drawn:"drew",chosen:"chose"};
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
                // console.log("Found possessive:",word);
                if(j - 1 >= 0) {
                    let prevWord = sentence[j-1];
                    let prevTag = prevWord[1];
                    if(prevTag === "VBN" || prevTag === "VBD")
                        continue;
                }
                sentence.splice(j,1);
                j--;
            }
        }
        tagged[i] = sentence;
    }
    return tagged;
}

function removeAdjectives(tagged, textObject) {
    let tfidfs = textObject.tfidfs;
    let avg = textObject.tfidfAvg;
    for(let i = 0; i < tagged.length; i++) {
        let sentence = tagged[i];
        for(let j = 0; j < sentence.length; j++) {
            let pair = sentence[j];
            let word = pair[0];
            let tag = pair[1];
            if((tag === "JJ" || tag === "JJR" || tag === "JJS") && !util.isProperNoun(word)) {
                // perform various tests first because maybe it should not be removed
                if(j-1 >= 0) {
                    let prevWord = sentence[j-1][0];
                    if(prevWord === "not" || prevWord === "is" ||
                        prevWord === "are" || prevWord === "was" || prevWord === "were") continue;
                }
                if(j+1 < sentence.length) {
                    let nextWord = sentence[j+1][0];
                    let nextTag = sentence[j+1][1];
                    if(nextTag === "MD" || nextTag === "VBN") continue;
                }
                if(tfidfs[word] > avg*1.5) {
                    continue;
                }

                sentence.splice(j,1);
                j--;
            }
        }
        tagged[i] = sentence;
    }
    return tagged;
}

function removeClausePhrases(tagged,textObject,top3words) {
    let tfidfs = textObject.tfidfs;
    let avg = textObject.tfidfAvg;
    for(let i = 0; i < tagged.length; i++) {
        let sentence = tagged[i];
        let clause = false;
        let startIndex = -1, endIndex = -1;
        let sentenceClauses = [];
        for(let j = 0; j < sentence.length; j++) {
            let word = sentence[j][0].trim();
            let tag = sentence[j][1];
            if(tag === "IN" && !clause) {
                if(j-1 >= 0) {
                    let prev = sentence[j-1];
                    let prevTag = prev[1];
                    if(prevTag === "VBN") continue;
                }
                startIndex = j;
                clause = true;
            } else if(clause && (tag === "NN" || tag === "NNS")) {
                if(j+1 < sentence.length) {
                    let nextTag = sentence[j+1][1];
                    if(nextTag === "NN" || nextTag === "NNS") { /* continue */ }
                    else {
                        endIndex = j;
                        sentenceClauses.push([startIndex,endIndex]);
                        clause = false;
                    }
                } else {
                    endIndex = j;
                    sentenceClauses.push([startIndex,endIndex]);
                    clause = false;
                }
            } else if(clause && (word === "," )) {
                endIndex = j-1;
                sentenceClauses.push([startIndex,endIndex]);
                clause = false;
            }
        }
        tagged[i] = removeSentenceClauses(sentence,sentenceClauses,tfidfs,avg,top3words);
    }
    return tagged;
}

function removeSentenceClauses(sentence,sentenceClauses,tfidfs,avg,top3words) {
    console.log("importance threshold:",(avg*5.5));
    for(let clause of sentenceClauses) {
        let start = clause[0];
        let end = clause[1];

        //debug only
        console.log("---");
        for(let i = start; i <= end; i++) {
            console.log(sentence[i][0]);
        }

        // blacklist some prepositions
        let first = sentence[start][0];
        if(first === "that" || first === "after" || first === "about" || first === "if") continue;

        // check if any are important; if yes, must include this clause
        let important = false;
        for(let i = start; i <= end; i++) {
            // if(tfidfs[sentence[i][0]] > avg*5.5) {
            //     console.log("->deemed",sentence[i][0],"is important");
            //     important = true;
            //
            // }
            let curr = sentence[i][0].toLowerCase().trim();
            if(curr in top3words)
                important = true;
        }
        if(important) continue;
        console.log("->not important");

        for(let i = start; i <= end; i++) {
            // console.log(sentence[i][0]);
            sentence[i].toDelete = true;
        }
        console.log("---");
    }
    for(let i = 0; i < sentence.length; i++) {
        if(sentence[i].toDelete) {
            sentence.splice(i,1);
            i--;
        }
    }
    return sentence;
}

function removeOtherPhrases(tagged,textObject) {
    for(let i = 0; i < tagged.length; i++) {
        let sentence = tagged[i];

        // find various punctuation in sentence
        let commas = [], otherSeparators = [], k;
        for(k = 0; k < sentence.length; k++) {
            let test = sentence[k][0].trim();
            if (test === ",")
                commas.push(k);
            else if(test === "-")
                otherSeparators.push(k);
        }
        // console.log(i,"commas:",commas);
        // console.log(i,"others:",otherSeparators);

        if(commas.length === 1) {
            let pos = commas[0]/sentence.length;
            // console.log("comma at",pos);
            if(pos >= 0.7) {
                sentence.splice(commas[0]);
                sentence.push([".","."]);
            } else if(pos <= 0.3) {
                sentence.splice(0,commas[0]+1);
            }
        }

        if(otherSeparators.length === 2) {
            sentence.splice(otherSeparators[0], otherSeparators[1]-otherSeparators[0]+1);
        }
    }
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
            else if(nextWord === "." || nextWord === "," || nextWord === "'" || util.isNumeric(nextWord) || (word === "\"" && insideQuotes) || (word === "'" && nextWord === "s")) {
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

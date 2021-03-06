'use strict';
exports.isStopWord = function(word) {
    // thanks to stopword list at http://www.lextek.com/manuals/onix/stopwords1.html
    let stopWords = ["a","ago","about","above","across","after","again","against","all","almost","alone","along","already","also","although","always","among","an","and","another","any","anybody","anyone","anything",
    "anywhere","are","area","areas","around","as","ask","asked","asking","asks","at","away","b","back","backed","backing","backs","be","became","because","become","becomes","been","before","began","behind","being",
    "beings","best","better","between","big","both","but","by","c","came","can","cannot","case","cases","certain","certainly","clear","clearly","come","could","d","did","differ","different","differently","do","does","done",
    "down","down","downed","downing","downs","during","e","each","early","either","end","ended","ending","ends","enough","even","evenly","ever","every","everybody","everyone","everything","everywhere","f","face","faces",
    "fact","facts","far","felt","few","find","finds","first","for","four","from","full","fully","further","furthered","furthering","furthers","g","gave","general","generally","get","gets","give","given","gives",
    "going","good","goods","got","great","greater","greatest","group","grouped","grouping","groups","h","had","has","have","having","he","her","here","herself","high","high","high","higher","highest","him","himself","his","how","however","i","if","important","in","interest","interested","interesting","interests","into","is",
    "it","its","itself","j","just","k","keep","keeps","kind","knew","know","known","knows","l","large","largely","last","later","latest","least","less","let","lets","likely","long","longer","longest","m","made","make",
    "making","man","many","me","member","members","men","might","more","most","mostly","much","must","my","myself","n","necessary","need","needed","needing","needs","never","newer","newest","next","no","nobody",
    "non","noone","not","nothing","now","nowhere","number","numbers","o","of","off","often","old","older","oldest","on","once","one","only","open","opened","opening","opens","or","order","ordered","ordering",
    "orders","other","others","our","out","over","p","part","parted","parting","parts","per","perhaps","place","places","point","pointed","pointing","points","possible","present","presented","presenting","presents",
    "problem","problems","put","puts","q","quite","r","rather","really","right","right","room","rooms","s","said","same","saw","say","says","second","seconds","see","seem","seemed","seeming","seems","sees","several","shall",
    "she","should","show","showed","showing","shows","side","sides","since","small","smaller","smallest","so","some","somebody","someone","something","somewhere","state","states","still","still","such","sure","t","take",
    "taken","than","that","the","their","them","then","there","therefore","these","they","thing","things","think","thinks","this","those","though","thought","thoughts","three","through","thus","to","today","together","too",
    "took","toward","turn","turned","turning","turns","two","u","under","until","up","upon","us","use","used","uses","v","very","w","want","wanted","wanting","wants","was","way","ways","we","well","wells","went","were",
    "what","when","where","whether","which","while","who","whole","whose","why","will","with","within","without","work","worked","working","works","would","x","y","year","years","yet","you","young","younger","youngest","your","yours","z"];

    return stopWords.indexOf(word) > -1;
};

exports.isAlphaNum = function(word) {
    return /^[A-Za-z0-9]/.test(word[0]);
};

exports.isAlpha = function(word) {
    return /^[A-Za-z]/.test(word[0]);
};

exports.isNumeric = function(word) {
    return /^[0-9]/.test(word[0]);
};

exports.isUpperCase = function(word) {
    return (/^[A-Z]+$/.test(word[0]));
};

exports.isNormalWord = function(word) {
    let isAlNum = this.isAlphaNum(word);
    let hasNoSpace = word.indexOf(" ") < 0;
    let hasNoHyphen = word.indexOf("-") < 0;
    let hasNoComma = word.indexOf(",") < 0;
    return isAlNum && hasNoSpace && hasNoHyphen && hasNoComma;
};

exports.isProperNoun = function(word) {
    let hasSpaces = word.indexOf(" ") > -1;
    let isUpperCase = /^[A-Z]/.test(word[0]);
    return isUpperCase || hasSpaces;
};

exports.getAllIndexes = function(arr,val) {
    let indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
};

exports.isNameAsTitle= function(word) {
    let titles = ["mr", "mrs", "ms", "miss", "mx", "dr", "prof", "hon", "rev"];
    let divided = word.split(" ");
    let title = divided[0];
    return titles.indexOf(title) > -1;
};

exports.isMonthName = function(word) {
    return word === "january" || word === "february" || word === "march" || word === "april" ||
        word === "may" || word === "june" || word === "july" || word === "august" || word === "september" ||
        word === "october" || word === "november" || word === "december";
};

exports.containsWord = function(sentenceArray,word) {
    for(let curr of sentenceArray) {
        if(curr.toLowerCase() === word.toLowerCase())
            return true;
    }
    return false;
};

exports.getAllPossibleDomains = function() {
    // thanks to some from http://www.seobythesea.com/2006/01/googles-most-popular-and-least-popular-top-level-domains/ and https://en.wikipedia.org/wiki/List_of_Internet_top-level_domains
    return ["com","net","co","uk","ru","de","org","jp","fr","br","it","au","edu","gov","ch","us","ca","io"];
};
'use strict';
let express = require('express');
let bodyParser = require('body-parser');
let storyevolutiontracker = require("./storyevolutiontracker");
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post("/generate_signature",function(req,res) {
    let link = req.body.link;
    storyevolutiontracker.parseAndGenerateSignature(link,function(objects) {
        let response = {
            headline: objects.pageObject.headline,
            date: objects.pageObject.date,
            section: objects.pageObject.section,
            topicWords: objects.textObject.topicWords,
            signature: objects.signatures.plainSignature 
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(response));
    });
});

app.post("/get_next_article",function(req,res) {
    let words = req.body.words;
    console.log(words);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(words));
});

app.listen(3030, function () {
  console.log('SET listening on port 3030!',app.get('env'));
});
#!/usr/bin/env node
var http = require('http');
var url = require('url');
var bl = require('bl');
var cheerio = require('cheerio');

var bufferlist = bl();

var link = url.parse(process.argv[2]);

var options = {
    host: link.host,
    port: 80,
    path: link.path
};

http.get(options, function(response) {
    
    response.on('data', function(data) {
        bufferlist.append(data);
    });
    response.on('end', function(data) {
        parse(bufferlist);
    })
    response.on('error', function(err) {
        console.error(err);
    })

});

function parse(buffer) {
    var pageData = buffer.toString();
    var $ = cheerio.load(pageData); // parse into DOM

    var pageObject = { };

    // BBC
    pageObject.date = parseInt($('.date').attr('data-seconds'));
    console.log("Date: " + pageObject.date); 
    pageObject.headline = $('.story-body__h1').text();
    console.log("Headline: " + pageObject.headline);
    pageObject.intro = $('.story-body__introduction').text();
    console.log("Bolded: " + pageObject.intro);
    var storybodyinner = $(".story-body__inner").find('p');
    console.log("Num of paragraphs: " + storybodyinner.length);

}
'use strict';
let cheerio = require("cheerio");

exports.bbcParser = function(data) {
    let $ = cheerio.load(data);
    let pageObject = {};
    pageObject.date = parseInt($(".date").attr("data-seconds"),10);
    pageObject.formattedDate = $(".date").attr("data-datetime");
    pageObject.section = $(".mini-info-list__section").first().text();
    pageObject.headline = $(".story-body__h1").text();
    pageObject.bolded = $(".story-body__introduction").first().text();

    let paragraphs = [];
    let storyBody = $(".story-body__inner");
    if(storyBody.length === 0) {
        storyBody = $(".map-body");
        pageObject.bolded = storyBody.find("p").first().text();
    }
    let numHrElements = storyBody.find("hr").length;
    let insideHr = false;

    storyBody.children().each(function(i,element) {
        let isParagraph = $(this).is("p");
        let isHrElement = $(this).is("hr");
        let hasStrongTag = $(this).find("strong").html() !== null;
        let numChildren = $(this).children().length;

        if(isHrElement && numHrElements % 2 === 0 && !insideHr && numHrElements > 0) {
            // entered an hr block that we expect to end somewhere, contents of this block not included
            insideHr = true;
        } else if(!isHrElement && insideHr) {
            // just continue
        } else if(isHrElement && insideHr) {
            // left an hr block that was started before
            numHrElements = numHrElements - 2;
            insideHr = false;
        } else if(isHrElement && numHrElements === 1) {
            // found a single hr, any text below it is irrelevant so do not include
            return false;
        } else if(isParagraph && !hasStrongTag && numChildren === 0) {
            // add to list of paragraphs if currently looking at a paragraph
            paragraphs.push($(this).text());
        }
    });
    pageObject.paragraphs = paragraphs;

    return pageObject;
};

exports.bbcSportsParser = function(data) {
    let $ = cheerio.load(data);
    let pageObject = {};
    pageObject.date = parseInt($("time").attr("data-timestamp"));

    pageObject.formattedDate = $("abbr.medium-abbr-off").attr("title");
    if(!pageObject.formattedDate)
        pageObject.formattedDate = $("abbr.abbr-on").attr("title");

    pageObject.section = $("span.section-tag.section-tag--nested-link.gel-brevier").find("a").first().text();
    pageObject.headline = $(".story-headline").text();
    pageObject.bolded = $(".sp-story-body__introduction").text();
    
    let paragraphs = [];
    let storyBody = $("#story-body");
    let numHrElements = storyBody.find("hr").length;
    let insideHr = false;

    storyBody.children().each(function(i,element) {
        let isParagraph = $(this).is("p");
        let isHrElement = $(this).is("hr");
        let hasStrongTag = $(this).find("strong").html() !== null;
        let numChildren = $(this).children().length;

        if(isHrElement && numHrElements % 2 === 0 && !insideHr && numHrElements > 0) {
            // entered an hr block that we expect to end somewhere, contents of this block not included
            insideHr = true;
        } else if(!isHrElement && insideHr) {
            // just continue
        } else if(isHrElement && insideHr) {
            // left an hr block that was started before
            numHrElements = numHrElements - 2;
            insideHr = false;
        } else if(isHrElement && numHrElements === 1) {
            // found a single hr, any text below it is irrelevant so do not include
            return false;
        } else if(isParagraph && !hasStrongTag && numChildren === 0) {
            // add to list of paragraphs if currently looking at a paragraph
            paragraphs.push($(this).text());
        }
    });
    pageObject.paragraphs = paragraphs;

    return pageObject;
};


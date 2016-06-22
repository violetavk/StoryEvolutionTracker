'use strict';
let cheerio = require("cheerio");

exports.bbcParser = function(data) {
    let $ = cheerio.load(data);
    let pageObject = {};
    pageObject.date = parseInt($(".date").attr("data-seconds"));
    pageObject.formattedDate = $(".date").attr("data-datetime");
    pageObject.section = $(".mini-info-list__section").text();
    pageObject.headline = $(".story-body__h1").text();
    pageObject.bolded = $(".story-body__introduction").text();

    let paragraphs = [];
    $(".story-body__inner").children().each(function(i,element) {
        let isParagraph = $(this).is("p");
        let isFigure = $(this).is("figure");
        let isDiv = $(this).is("div");
        let isEmpty = $(this).html().length === 0;
        let isHrElement = $(this).is("hr");
        let hasStrongTag = $(this).find("strong").html() !== null;

        // console.log("Current element: ",$(this).html().length);
        // console.log("isParagraph: ",isParagraph," isFigure: ",isFigure," isDiv: ",isDiv," isHr: ",isHrElement);

        if(!isEmpty && isHrElement) {
            console.log("---Stopping Loop, found HR---");
            return false;
        }

        // add to list of paragraphs if currently looking at a paragraph
        if(isParagraph && !hasStrongTag) {
            // console.log("-Adding this");
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
    $("#story-body").find("p").each(function(i,element) {
        paragraphs.push($(this).text());
    });
    pageObject.paragraphs = paragraphs;

    return pageObject;
};


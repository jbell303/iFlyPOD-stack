var XMLWriter = require('xml-writer');
var fs = require('fs');
var cheerio = require('cheerio');

class XMLParser {
  constructor(html, date, dateTag, squadron) {
    this.html = html;
    this.date = date;
    this.dateTag = dateTag;
    this.squadron = squadron;
  }

  parse() {
    var xw = new XMLWriter;
    xw.startDocument();
    // <schedule>
    xw.startElement('schedule');
    //  <date>xxxx</date>
    xw.writeElement('date', this.date);
    //  <squadron>vt-xx</squadron>
    xw.writeElement('squadron', this.squadron);

    // load the document
    var $ = this.html;

    // add <notes>
    var notes_html = $('#dgCoversheet');
    if (notes_html) {
      xw.writeElement('notes', notes_html.text());
    }

    // add the <events>
    xw.startElement('events');
    // remove header
    $('#dgEvents').find('tr').has('a').remove();
    // convert event lines
    $('#dgEvents').find('tr').each(function(i, elem) {
      xw.startElement('event'); // <event>
      $(this).children().each(function(i, elem) {
        // add appropriate tag to event e.g. <type>Flight</type>
        xw.writeElement(tagName(i), $(this).text());
      });
      xw.endElement(); // </events>
    });

    // close document
    xw.endDocument();

    // [DEBUG] output to console
    // console.log(xw.toString());

    // write to file
    // console.log('[DEBUG] writing to file');
    // fs.writeFile('out.xml', xw, function(err) {
    //   if(err) {
    //     return console.error(err);
    //   }
    //
    //   console.log('[DEBUG] data written successfully!');
    // });

    return xw.toString();
  }
}

module.exports = XMLParser;

// Test script
// fs.readFile('sample.html', function(err, data) {
//   if (err) {
//     return console.error(err);
//   }
//   // [DEBUG] console.log(data.toString());
//   var parser = new XMLParser(data.toString(), '1234', '1JAN77', 'vt-7');
//   parser.parse();
// })
// end test script

// index -> tagName
function tagName(index) {
  switch (index) {
    case 0:
      return 'type';
    case 1:
      return 'vt';
    case 2:
      return 'brief';
    case 3:
      return 'edt';
    case 4:
      return 'rtb';
    case 5:
      return 'instructor';
    case 6:
      return 'student';
    case 7:
      return 'event';
    case 8:
      return 'hrs';
    case 9:
      return 'remarks';
    case 10:
      return 'location';
    default:
      return 'other';
  }
}

// XML Writer usage
// xw = new XMLWriter;
// xw.startDocument();
// xw.startElement('root');
// xw.writeAttribute('foo', 'value');
// xw.text('Some content');
// xw.endDocument();
//
// console.log(xw.toString());

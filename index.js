var rp = require('request-promise');
var cheerio = require('cheerio');
var XMLParser = require('./xml_parser.js');
var fs = require('fs');
var AWS = require('aws-sdk');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var md = 'GET';
var squadron = 'vt-7';
const uri = 'https://www.cnatra.navy.mil/scheds/schedule_data.aspx';
var name = '';
const date = '18Apr2018';

// .NET postback parameters
var eventTarget = '';
var eventArgument = '';
var viewstate = '';
var viewstateGenerator = '';
var validation = '';
var viewSched = '';

exports.handler = (event, context, callback) => {
  console.log('fetching schedule...');
  rp (getOptions())
    .then(($) => {
      eventTarget = 'ctrlCalendar';
      eventArgument = skedDateFormat(date);
      saveViewstate($);
      md = 'POST';

      // send another postback
      rp(getOptions())
        .then(($) => {
          eventTarget = '';
          eventArgument = '';
          saveViewstate($);
          viewSched = 'View Schedule'

        // retrieve the schedule
        rp(getOptions())
          .then(($) => {
            // [DEBUG]
            // console.log($('#dgCoversheet').text());
            // console.log($('#dgEvents').text());
            // callback(null, "success");

            //parse html to XML
            var xml_parser = new XMLParser($, date, '1JAN77', 'vt-7');
            
            // write to S3 bucket
            var path = squadron + "/" + date + ".xml";
            console.log('schedule fetched, writing to s3: ' + path);
            putObjectToS3("iflypod-xml-repository", path, xml_parser.parse());
          })
          .catch((err) => {
            console.log(err);
          })
        })
        .catch((err) => {
          console.log(err);
        })
    })
    .catch((err) => {
      console.log(err);
    })
}

function getOptions() {
  return {
      method: md,
      uri: uri,
      qs: {
        sq: squadron,
      },
      form: {
        __EVENTTARGET: eventTarget,
        __EVENTARGUMENT: eventArgument,
        __VIEWSTATE : viewstate,
        __VIEWSTATEGENERATOR: viewstateGenerator,
        __EVENTVALIDATION: validation,
        btnViewSched: '',
        txtNameSearch: name,
      },
      headers: {
        'User-Agent': 'Request-Promise'
      },
      transform: function (body) {
        return cheerio.load(body);
      }
    }
}

  function saveViewstate($) {
    viewstate = $('#__VIEWSTATE').val();
    viewstateGenerator = $('#__VIEWSTATEGENERATOR').val();
    validation = $('#__EVENTVALIDATION').val();
  }

  function skedDateFormat(date) {
    return Math.round(Date.parse(date) / 86400000 - 10957);
  }

  function putObjectToS3(bucket, key, data) {
    var s3 = new AWS.S3();
    var params = {
      Bucket: bucket,
      Key : key,
      Body : data
    }
    s3.putObject(params, function(err, data) {
      if (err) console.log(err);
      else console.log(data);
    });
  }
var rp = require('request-promise');
var cheerio = require('cheerio');
var XMLParser = require('./xml_parser.js');
var fs = require('fs');
var AWS = require('aws-sdk');
var moment = require('moment');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var squadron = 'vt-7';
const uri = 'https://www.cnatra.navy.mil/scheds/schedule_data.aspx';
const date = moment().startOf('day').format('DDMMMYYYY');

// .NET postback parameters
var options =  {
  method: 'GET',
  uri: uri,
  resolveWithFullResponse: true,
  qs: {
    sq: squadron,
  },
  formData: {
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    __VIEWSTATE : '',
    __VIEWSTATEGENERATOR: '',
    __EVENTVALIDATION: '',
    txtNameSearch: '',
  },
  headers: {
    'User-Agent': 'Request-Promise'
  },
  transform: function (body) {
    return cheerio.load(body);
  }
}

// s3 paramaters
var s3 = new AWS.S3();
var path = squadron + "/" + date + ".xml";
var params = {
  Bucket : "iflypod-xml-repository",
  Key : path
}

exports.handler = (event, context, callback) => {
  // check if object exists
  s3.headObject(params, function (err, metadata) {
    if (err && err.code === 'NotFound') {
      // retrieve schedule and write to XML
      console.log('fetching schedule...');
      rp (options)
        .then(($) => {
          // console.log("First call: " + $.statusCode);
          options.formData.__EVENTTARGET = 'ctrlCalendar';
          options.formData.__EVENTARGUMENT = skedDateFormat(date);
          saveViewstate($);
          options.method = 'POST';

          // send another postback
          rp(options)
            .then(($) => {
              // console.log("Second call: " + $.statusCode);
              options.formData.__EVENTTARGET = '';
              options.formData.__EVENTARGUMENT = '';
              saveViewstate($);

              // retrieve the schedule
              options.formData.btnViewSched = "View Schedule";
              rp(options)
                .then(($) => {
                  // [DEBUG]
                  // console.log($('#dgCoversheet').text());
                  // console.log($('#dgEvents').text());
                  // callback(null, "success");

                  // console.log("Third call: " + $.statusCode);
                  //parse html to XML
                  var xml_parser = new XMLParser($, date, squadron);
                  params.Body = xml_parser.parse();

                  // write to S3 bucket
                  console.log('schedule fetched, writing to s3: ' + path);
                  s3.putObject(params, function(err, data) {
                    if (err) console.log(err);
                    else {
                      console.log(data);
                      callback(null, path + " written successfully!")
                    }
                  });
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
    } else {
      // object already exists
      callback(null, "object: " + path + " already exists!");
    }
  })
}

  function saveViewstate($) {
    options.formData.__VIEWSTATE = $('#__VIEWSTATE').val();
    options.formData.__VIEWSTATEGENERATOR = $('#__VIEWSTATEGENERATOR').val();
    options.formData.__EVENTVALIDATION = $('#__EVENTVALIDATION').val();
  }

  function skedDateFormat(date) {
    return Math.round(Date.parse(date) / 86400000 - 10957);
  }

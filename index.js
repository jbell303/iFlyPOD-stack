var rp = require('request-promise');
var cheerio = require('cheerio');
var XMLParser = require('./xml_parser.js');
var fs = require('fs');
var AWS = require('aws-sdk');
var moment = require('moment');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var squadrons = ['vt-7', 'vt-9'];
const uri = 'https://www.cnatra.navy.mil/scheds/schedule_data.aspx';
// const date = moment().startOf('day').add(1, 'days').format('DDMMMYYYY');
const date = moment().startOf('day').format('DDMMMYYYY');
var options = '';

exports.handler = (event, context, callback) => {
  squadrons.forEach(function(squadron) {
    // .NET postback parameters
    options =  {
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
                        // add schedule to available list
                        console.log(path + " written successfully! " + data);
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
        console.log("object: " + path + " already exists! " + moment().format('MMMM Do YYYY, h:mm:ss a'));
      }
    })
  })
  callback(null, "success!");
}

  function saveViewstate($) {
    options.formData.__VIEWSTATE = $('#__VIEWSTATE').val();
    options.formData.__VIEWSTATEGENERATOR = $('#__VIEWSTATEGENERATOR').val();
    options.formData.__EVENTVALIDATION = $('#__EVENTVALIDATION').val();
  }

  function skedDateFormat(date) {
    return Math.round(Date.parse(date) / 86400000 - 10957);
  }

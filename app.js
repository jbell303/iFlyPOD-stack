var rp = require('request-promise');
var cheerio = require('cheerio');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var md = 'GET';
var squadron = 'vt-7';
const uri = 'https://www.cnatra.navy.mil/scheds/schedule_data.aspx';
var name = '';
const date = '6680';

// .NET postback parameters
var eventTarget = '';
var eventArgument = '';
var viewstate = '';
var viewstateGenerator = '';
var validation = '';
var viewSched = '';

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

rp (getOptions())
  .then(($) => {
    eventTarget = 'ctrlCalendar';
    eventArgument = date;
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
          console.log($('#dgCoversheet').text())
          console.log($('#dgEvents').text());
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

  function saveViewstate($) {
    viewstate = $('#__VIEWSTATE').val();
    viewstateGenerator = $('#__VIEWSTATEGENERATOR').val();
    validation = $('#__EVENTVALIDATION').val();
  }

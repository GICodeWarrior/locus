/*
 * Copyright (c) 2019 Rusty Burchfield
 *
 * This software may be modified and distributed under the terms
 * of the MIT License.  See the LICENSE file for details.
 */
'use strict';

const cloudwatchURLPrefix = 'https://console.aws.amazon.com/cloudwatch/home?';

// Lowercase alphanum and hyphen only; dns name parts are 63 chars max (RFC 1034)
// https://docs.aws.amazon.com/IAM/latest/UserGuide/console_account-alias.html#CreateAccountAlias
const awsAccountRegex = new RegExp('^[a-z0-9\\-]{1,63}$');

// Usernames are alphanum with plus, equal, comma, period, at, underscore, and hyphen
// Passwords are any Basic Latin
// https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html
const awsUsernameRegex = new RegExp('^[\\w+=,.@\\-]+$');
const awsPasswordRegex = new RegExp('^[ -~]+$');

// Validate what page we're on
const awsSigninRegex = '^https://([\\w.\\-]+\\.)?signin.aws.amazon.com/';
const awsSigninRegexRoot = new RegExp(awsSigninRegex + 'signin\\?');
const awsSigninRegexIAM = new RegExp(awsSigninRegex + 'oauth\\?');

const javascriptSet = function(id, value) {
  var selector = 'document.querySelector(' + JSON.stringify('#' + id) + ')';

  // Trigger change event to update angularjs form validation.
  return selector + '.value = ' + JSON.stringify(value) + ';' +
    selector + '.dispatchEvent(new Event("change", ' +
    '{view: window, bubbles: true, cancelable: true}));'
};

var CloudWatchDashboard = {
  validateConfig: function(config) {
    var validationFailures = [];
    if (!(config.cloudwatchURL && (typeof config.cloudwatchURL == 'string') &&
      config.cloudwatchURL.startsWith(cloudwatchURLPrefix))) {
      validationFailures.push('Amazon CloudWatch URL missing or doesn\'t start with '
        + cloudwatchURLPrefix);
    }

    if (!(config.account && (typeof config.account == 'string') &&
      config.account.match(awsAccountRegex))) {
      validationFailures.push('AWS Account ID or Alias missing or invalid');
    } else {
      config.awsSigninURL = 'https://' + config.account + '.signin.aws.amazon.com/console';
    }

    if (!(config.username && (typeof config.username == 'string') &&
      config.username.match(awsUsernameRegex))) {
      validationFailures.push('AWS IAM User Name missing or invalid');
    }

    if (!(config.password && (typeof config.password == 'string') &&
      config.password.match(awsPasswordRegex))) {
      validationFailures.push('AWS IAM User Password missing or invalid');
    }

    return validationFailures;
  },
  validatePage: function(webview, config) {
    if (webview.src != config.cloudwatchURL) {
      if (webview.src.match(awsSigninRegexIAM)) {
        console.log("validate page - identified IAM signin");
        loginWithRateLimit();
      } else if (webview.src.match(awsSigninRegexRoot)) {
        console.log("validate page - identified root signin");
        webview.src = config.awsSigninURL;
      } else {
        console.log("validate page - other non-match");
        webview.src = config.cloudwatchURL;
      }
    }
  },
  login: function(webview, config) {
    console.log('login - stuffing form');
    webview.executeScript({
      code: javascriptSet('account', config.account) +
        javascriptSet('username', config.username) +
        javascriptSet('password', config.password) +
        'document.querySelector("#signin_button").click();'
    });
  },
  isValid: function(webview, config) {
    return webview.src == config.cloudwatchURL;
  }
}

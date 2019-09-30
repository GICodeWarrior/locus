/*
 * Copyright (c) 2019 Rusty Burchfield
 *
 * This software may be modified and distributed under the terms
 * of the MIT License.  See the LICENSE file for details.
 */

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

// We're hooking events to verify the display.  Still, we do an extra check on this period.
const periodicValidationDelay = 60 * 1000;  // milliseconds

// Dynamic config loaded from local or managed storage (for kiosk mode)
var config;

onload = function() {
  console.log('onload - started');

  var webview = getWebview();
  webview.addEventListener('exit', handleExit);

  webview.addEventListener('contentload', debouncedValidatePage);
  webview.addEventListener('loadstop', debouncedValidatePage);
  webview.addEventListener('loadabort', debouncedValidatePage);
  webview.addEventListener('loadredirect', debouncedValidatePage);
  webview.addEventListener('loadcommit', debouncedValidatePage);

  var storage = window.isKiosk ? chrome.storage.managed : chrome.storage.local;
  updateConfig(storage, function(result) {
    if (result) validatePage();
    else webview.src = 'about:blank';
    webview.focus();  // Required to start the load

    setInterval(debouncedValidatePage, periodicValidationDelay);
    console.log('setup - finished');
  });

  chrome.storage.onChanged.addListener(function() {
    console.log('storage - configuration changed');

    updateConfig(storage, function(result) {
      if (result) debouncedValidatePage();
    });
  });

  console.log('onload - finished');
}

function updateConfig(storage, callback) {
  console.log('updateconfig - requesting configuration');

  storage.get(null, function(items) {
    console.log('updateconfig - configuration received');
    config = Object.create(items);

    // Run validations
    var validationFailures = [];
    if (!(config.cloudwatchURL && (typeof config.cloudwatchURL == 'string') &&
        config.cloudwatchURL.startsWith(cloudwatchURLPrefix))) {
      validationFailures.push('Amazon CloudWatch URL missing or doesn\'t start with '
        + cloudwatchURLPrefix);
    }

    if (!(config.account && (typeof config.account == 'string') &&
        config.account.match(awsAccountRegex))) {
      validationFailures.push('AWS Account ID or Alias missing or invalid');
    }

    if (!(config.username && (typeof config.username == 'string') &&
        config.username.match(awsUsernameRegex))) {
      validationFailures.push('AWS IAM User Name missing or invalid');
    }

    if (!(config.password && (typeof config.password == 'string') &&
        config.password.match(awsPasswordRegex))) {
      validationFailures.push('AWS IAM User Password missing or invalid');
    }

    var overlay = document.querySelector('div#overlay');
    while (overlay.firstChild) {
      // Clear any existing errors
      overlay.removeChild(overlay.firstChild);
    }

    if (validationFailures.length) {
      config = Object.freeze({ valid: false });

      var list = document.createElement('ul');
      validationFailures.forEach(function(description) {
        console.warn('updateconfig - configuration error:', description);
        var item = document.createElement('li');
        item.textContent = description;
        list.appendChild(item);
      });
      overlay.appendChild(list);

      callback(false);
      return;
    }

    config.awsSigninURL = 'https://' + config.account + '.signin.aws.amazon.com/console';
    config.valid = true;
    Object.freeze(config);

    console.log('updateconfig - configuration success');
    callback(true);
  });
}

function handleExit(event) {
  console.log("exit occurred: " + event.type);
  
  if (event.reason !== 'normal') {
    debouncedValidatePage();
  }
}

function validatePage() {
  if (!config.valid) {
    console.log('validate page - skipping due to invalid config');
    return;
  }

  var webview = getWebview();
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
}

const minimumLoginDelay = 60 * 1000;  // milliseconds
var loginAttemptedAt = 0;
var activeLoginTimer;
function loginWithRateLimit() {
  var remainingTime = minimumLoginDelay - (Date.now() - loginAttemptedAt);
  if (remainingTime > 0) {
    console.warn('login - rate limiting in effect', {
      now: Date.now(),
      lastAttempt: loginAttemptedAt,
      minDelay: minimumLoginDelay
    });
    if (activeLoginTimer) return;

    activeLoginTimer = setTimeout(function() {
      activeLoginTimer = undefined;
      loginWithRateLimit();
    }, remainingTime);

    return;
  }

  if (!config.valid) {
    console.log('login - skipping due to invalid config');
    return;
  }

  console.log('login - stuffing form');
  loginAttemptedAt = Date.now();
  getWebview().executeScript({
    code: javascriptSet('account', config.account) +
      javascriptSet('username', config.username) +
      javascriptSet('password', config.password) +
      'document.querySelector("#signin_button").click();'
  });
}

function javascriptSet(id, value) {
  var selector = 'document.querySelector(' + JSON.stringify('#' + id) + ')';

  // Trigger change event to update angularjs form validation.
  return selector + '.value = ' + JSON.stringify(value) + ';' +
    selector + '.dispatchEvent(new Event("change", ' +
    '{view: window, bubbles: true, cancelable: true}));'
}

const validateDelay = 1000;  // milliseconds
var activeValidateTimer;
function debouncedValidatePage() {
  if (activeValidateTimer) {
    clearTimeout(activeValidateTimer);
  }

  activeValidateTimer = setTimeout(function() {
    activeValidateTimer = undefined;
    validatePage();
  }, validateDelay);
}

function getWebview() {
  return document.querySelector('webview');
}

/*
 * Copyright (c) 2019 Rusty Burchfield
 *
 * This software may be modified and distributed under the terms
 * of the MIT License.  See the LICENSE file for details.
 */
'use strict';

// We're hooking events to verify the display.  Still, we do an extra check on this period.
const periodicValidationDelay = 60 * 1000;  // milliseconds

const dashboardTypes = {
  okta: OktaDashboard,
  cloudwatch: CloudWatchDashboard
};

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

function handleExit(event) {
  console.log("exit occurred: " + event.type);

  if (event.reason !== 'normal') {
    debouncedValidatePage();
  }
}

function updateConfig(storage, callback) {
  console.log('updateconfig - requesting configuration');

  storage.get(null, function(items) {
    console.log('updateconfig - configuration received', items);

    var validationFailures = [];
    if (!(items.dashboardType && dashboardTypes.hasOwnProperty(items.dashboardType))) {
      validationFailures.push('Dashboard Type missing or invalid');
    } else if (!(items[items.dashboardType] && (typeof items[items.dashboardType] == "object"))) {
      validationFailures.push('Dashboard config missing or invalid');
    } else {
      config = Object.create(items);
      Object.assign(config, items[items.dashboardType]);
      config.Dashboard = dashboardTypes[items.dashboardType];
      validationFailures = config.Dashboard.validateConfig.call(undefined, config);
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

    config.valid = true;
    Object.freeze(config);

    console.log('updateconfig - configuration success');
    prepareForcedReload(true);
    callback(true);
  });
}

function validatePage() {
  if (!config.valid) {
    console.log('validate page - skipping due to invalid config');
    return;
  }

  var overlay = document.querySelector('div#overlay');
  if (!(config.showLoginProcess || config.Dashboard.isValid.call(undefined, getWebview(), config))) {
    overlay.classList.add('loading');
  } else {
    overlay.classList.value = '';
  }

  config.Dashboard.validatePage.call(undefined, getWebview(), config);
  prepareForcedReload();
}

var activeReloadTimer;
function prepareForcedReload(forceResetTimer) {
  if (forceResetTimer && activeReloadTimer) {
    console.log('Resetting forced reload');
    clearInterval(activeReloadTimer);
    activeReloadTimer = undefined;
  }

  var period = parseInt(config.forceReloadPeriod, 10);
  var valid = config.Dashboard.isValid.call(undefined, getWebview(), config);
  if (period && valid && !activeReloadTimer) {
    console.log('Enabled forced reload', period);
    activeReloadTimer = setInterval(function() {
      console.log('Reached forced reload time', period);
      getWebview().reload();
    }, period * 1000);
  } else if (!(period && valid) && activeReloadTimer) {
    console.log('Disabled forced reload');
    clearInterval(activeReloadTimer);
    activeReloadTimer = undefined;
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
      debouncedValidatePage();
    }, remainingTime);

    return;
  }

  if (!config.valid) {
    console.log('login - skipping due to invalid config');
    return;
  }

  console.log('login - executing');
  loginAttemptedAt = Date.now();

  config.Dashboard.login.call(undefined, getWebview(), config);
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

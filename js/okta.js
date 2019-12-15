/*
 * Copyright (c) 2019 Rusty Burchfield
 *
 * This software may be modified and distributed under the terms
 * of the MIT License.  See the LICENSE file for details.
 */
'use strict';

const oktaDomainRegex = RegExp('.+\\.okta(preview)?\\.com$');
const oktaAppPathPrefix = '/';

// Support only TLS
const appDestinationURLPrefix = 'https://';

const oktaLoginRegex = RegExp('^https://([\\w.\\-]+\\.)?okta(preview)?.com/login');

const getOktaAuthURL = function(config) {
  return 'https://' + config.oktaDomain + '/api/v1/authn';
};

const getOktaAppLoginURL = function(config) {
  return 'https://' + config.oktaDomain + config.oktaAppPath;
};

var OktaDashboard = {
  validateConfig: function(config) {
    var validationFailures = [];
    if (!(config.oktaUsername && (typeof config.oktaUsername == 'string'))) {
      validationFailures.push('Okta User Name missing');
    }

    if (!(config.oktaPassword && (typeof config.oktaPassword == 'string'))) {
      validationFailures.push('Okta Password missing');
    }

    if (!(config.oktaDomain && (typeof config.oktaDomain == 'string') &&
      config.oktaDomain.match(oktaDomainRegex))) {
      validationFailures.push('Okta Domain missing or invalid');
    }

    if (!(config.oktaAppPath && (typeof config.oktaAppPath == 'string') &&
      config.oktaAppPath.startsWith(oktaAppPathPrefix))) {
      validationFailures.push('Okta Application Path missing or doesn\'t start with '
        + oktaAppPathPrefix);
    }

    if (!(config.appDestinationURL && (typeof config.appDestinationURL == 'string') &&
      config.appDestinationURL.startsWith(appDestinationURLPrefix))) {
      validationFailures.push('Application Destination URL missing or doesn\'t start with '
        + appDestinationURLPrefix);
    }

    if (!(config.appLoggedOutRegex && (typeof config.appLoggedOutRegex == 'string'))) {
      // Not checking for ReDos since it's a self-attack in this instance
      validationFailures.push('Application Logged Out Regex missing');
    }

    return validationFailures;
  },
  validatePage: function(webview, config) {
    if (webview.src != config.appDestinationURL) {
      if (webview.src.match(oktaLoginRegex)) {
        console.log("validate page - identified Okta signin");
        loginWithRateLimit();
      } else if (webview.src.match(config.appLoggedOutRegex)) {
        console.log("validate page - identified app logged out");
        webview.src = getOktaAppLoginURL(config);
      } else {
        console.log("validate page - other non-match", webview.src);
        webview.src = config.appDestinationURL;
      }
    }
  },
  login: function(webview, config) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", getOktaAuthURL(config), true);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
      if (this.readyState != XMLHttpRequest.DONE) {
        return;
      }

      if (this.status == 200) {
        var token = JSON.parse(this.responseText).sessionToken;
        webview.src = getOktaAppLoginURL(config) + '?sessionToken='
          + encodeURIComponent(token);
      } else {
        loginWithRateLimit();
      }
    };
    xhr.send(JSON.stringify({
      username: config.oktaUsername,
      password: config.oktaPassword
    }));
  },
  isValid: function(webview, config) {
    return webview.src == config.appDestinationURL;
  }
}

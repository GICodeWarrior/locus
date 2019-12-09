/*
 * Copyright (c) 2019 Rusty Burchfield
 *
 * This software may be modified and distributed under the terms
 * of the MIT License.  See the LICENSE file for details.
 */
'use strict';

chrome.app.runtime.onLaunched.addListener(function(launchData) {
  var isKiosk = !!launchData.isKioskSession;

  if (isKiosk) {
    chrome.power.requestKeepAwake('display');
  } else {
    chrome.app.window.create('html/config.html', {
      id: 'config',
      bounds: {
        width: 500,
        height: 400
      }
    });
  }

  chrome.app.window.create('html/locus.html', {
    id: 'viewer',
    state: isKiosk ? 'fullscreen' : 'normal'
  }, function(locusWindow) {
    locusWindow.contentWindow.isKiosk = isKiosk;
  });
});
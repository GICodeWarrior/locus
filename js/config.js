/*
 * Copyright (c) 2019 Rusty Burchfield
 *
 * This software may be modified and distributed under the terms
 * of the MIT License.  See the LICENSE file for details.
 */

onload = function() {
  chrome.storage.local.get(null, function(items) {
    document.querySelectorAll('input').forEach(function(input) {
      if (items[input.name]) {
        input.value = items[input.name];
        console.log('input - loaded from storage', input.name);
      }
      input.addEventListener('change', function() {
        var setting = {};
        setting[input.name] = input.value;
        chrome.storage.local.set(setting);
        console.log('input - saved to storage', input.name);
      });
    });
  });
};
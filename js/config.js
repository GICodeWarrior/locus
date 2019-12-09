/*
 * Copyright (c) 2019 Rusty Burchfield
 *
 * This software may be modified and distributed under the terms
 * of the MIT License.  See the LICENSE file for details.
 */
'use strict';

onload = function() {
  var updateView = function(type) {
    document.querySelectorAll('fieldset').forEach(function(fieldset) {
      fieldset.style.display = fieldset.id == type + '-fields' ? '' : 'none';
    })
  }

  chrome.storage.local.get(null, function(items) {
    console.log('loading settings', items);

    var select = document.querySelector('select');
    if (items[select.name]) {
      select.value = items[select.name];
      console.log('select - loaded from storage', select.name);
    }
    select.addEventListener('change', function() {
      var setting = { [select.name]: select.value };
      chrome.storage.local.set(setting);
      updateView(select.value);
      console.log('select - saved to storage', setting);
    });
    updateView(select.value);

    document.querySelectorAll('input').forEach(function(input) {
      var type = input.closest('fieldset').id.replace(/-fields$/, '');

      if (items[type] && items[type][input.name]) {
        input.value = items[type][input.name];
        console.log('input - loaded from storage', input.name);
      }
      input.addEventListener('change', function() {
        var typeSettings = items[type] || {};
        typeSettings[input.name] = input.value;
        items[type] = typeSettings;

        var setting = { [type]: typeSettings };
        chrome.storage.local.set(setting);
        console.log('input - saved to storage', setting);
      });
    });
  });
};
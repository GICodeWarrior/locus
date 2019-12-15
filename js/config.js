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

    document.querySelector('form').addEventListener('submit', function(e) {
      e.preventDefault();
    });

    var select = document.querySelector('select');
    if (items[select.name]) {
      select.value = items[select.name];
      console.log('select - loaded from storage', select.name);
    }
    select.addEventListener('change', function() {
      items[select.name] = select.value;
      chrome.storage.local.set(items);
      updateView(select.value);
      console.log('select - saved to storage', items);
    });
    updateView(select.value);

    document.querySelectorAll('form > label > input').forEach(function(input) {
      if (items[input.name]) {
        if (input.type == 'checkbox'){
          input.checked = items[input.name]
        } else {
          input.value = items[input.name]
        }
        console.log('input - loaded from storage', input.name);
      }
      input.addEventListener('change', function() {
        var setting = { [input.name]: input.value};
        if (input.type == 'checkbox') {
          setting[input.name] = input.checked;
        }
        chrome.storage.local.set(setting);
        Object.assign(items, setting);
        console.log('input - saved to storage', setting);
      });
    });

    document.querySelectorAll('fieldset > label > input').forEach(function(input) {
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

    document.querySelector('button').addEventListener('click', function() {
      var status = document.querySelector('div#export-status');
      status.classList.value = '';
      void status.offsetWidth;  // trigger reflow to reset animation

      var dashboardType = items['dashboardType'] || 'none';
      var toExport = {
        dashboardType: {
          'Value': dashboardType,
        },
        [dashboardType]: {
          'Value': items[dashboardType] || {}
        }
      };

      navigator.clipboard.writeText(JSON.stringify(toExport, null, 2))
        .then(function() {
          status.classList.add('success');
        }).catch(function() {
          status.classList.add('failure');
        });
    });
  });
};
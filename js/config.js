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
  };

  var getDashboardType = function() {
    return document.querySelector('select[name=dashboardType]').value || 'none';
  };

  var readInput = function(input) {
    if (input.type == 'checkbox') {
      return input.checked;
    } else if (input.type == 'number') {
      return input.valueAsNumber;
    }
    return input.value;
  };

  var buildSubFields = function(dashboardType) {
    var selector = 'fieldset#' + dashboardType + '-fields > label > input';
    var settings = {};

    document.querySelectorAll(selector).forEach(function(input) {
      var value = readInput(input);
      if (value) {
        settings[input.name] = value;
      }
    });

    return settings;
  };

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

    document.querySelectorAll('form > label > input').forEach(function(input) {
      if (items[input.name]) {
        if (input.type == 'checkbox') {
          input.checked = items[input.name]
        } else {
          input.value = items[input.name]
        }
        console.log('input - loaded from storage', input.name);
      }
      input.addEventListener('change', function() {
        var value = readInput(input);
        if (value) {
          var setting = { [input.name]: value };
          chrome.storage.local.set(setting);
          console.log('input - saved to storage', setting);
        } else {
          chrome.storage.local.remove(input.name);
          console.log('input - removed from storage', input.name);
        }
      });
    });

    document.querySelectorAll('fieldset > label > input').forEach(function(input) {
      var type = input.closest('fieldset').id.replace(/-fields$/, '');

      if (items[type] && items[type][input.name]) {
        input.value = items[type][input.name];
        console.log('input - loaded from storage', input.name);
      }
      input.addEventListener('change', function() {
        var setting = { [type]: buildSubFields(type) };
        chrome.storage.local.set(setting);
        console.log('input - saved to storage', setting);
      });
    });

    document.querySelector('form').addEventListener('submit', function(e) {
      e.preventDefault();

      var status = document.querySelector('div#export-status');
      status.classList.value = '';
      void status.offsetWidth;  // trigger reflow to reset animation

      var dashboardType = getDashboardType();
      var toExport = {
        dashboardType: { 'Value': dashboardType },
        [dashboardType]: { 'Value': buildSubFields(dashboardType) }
      };

      document.querySelectorAll('form > label > input').forEach(function(input) {
        var value = readInput(input);
        if (value) {
          toExport[input.name] = { 'Value': value };
        }
      });

      navigator.clipboard.writeText(JSON.stringify(toExport, null, 2))
        .then(function() {
          status.classList.add('success');
        }).catch(function() {
          status.classList.add('failure');
        });
    });
  });
};
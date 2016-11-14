'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = VersionBumper;

var _devup = require('../lib/devup');

var devup = _interopRequireWildcard(_devup);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var minimist = require('minimist');
var fs = require('fs');
var shellescape = require('shell-escape');

var prompt = require('prompt');
prompt.message = "";
prompt.delimiter = "";

function VersionBumper(bump_type, files) {

  var file_locations = files.map(function (file) {
    return file.location;
  });

  var message = void 0;
  var next_version = void 0;
  devup.ensure_branch("master").then(function () {
    return devup.ensure_consistency.apply(devup, [undefined].concat(_toConsumableArray(files)));
  }).then(function (current_version) {
    return devup.calculate_bump(current_version, bump_type);
  }).then(function (updated_version) {
    next_version = updated_version;
    return next_version;
  }).then(function (next_version) {
    return get_tag_message(next_version);
  }).then(function (user_response) {
    return message = shellescape([user_response]);
  }).then(function () {
    return next_version = devup.bump_version.apply(devup, [bump_type].concat(_toConsumableArray(files)));
  }).then(function () {
    return ask_question("would you like to commit these changes locally?", "yes");
  }).then(function (response) {
    if (!response) {
      console.log("version numbers have been updated locally. changes have not been committed");
      process.exit(0);
    }
    return next_version;
  }).then(function (v) {
    devup.commit_to_git.apply(devup, ['bumping version numbers to ' + v + ' - ' + message].concat(_toConsumableArray(file_locations)));
  }).then(function () {
    return devup.add_tag_to_git(next_version, message);
  }).then(function () {
    return ask_question("would you like to push your changes to origin?", "yes");
  }).then(function (response) {
    if (!response) {
      console.log("your local branch has been updated and a tag has been created, but they have not been pushed to origin");
      process.exit(0);
    }
  }).then(function () {
    return devup.push_to_git(next_version, message);
  }).catch(function (err) {
    console.log(err);
    process.exit(1);
  });
}

function ask_question(question, default_question) {
  var msg = '\n' + question;
  return new Promise(function (resolve, reject) {
    prompt.start();
    prompt.get([{ properties: { push: {
          message: msg.cyan,
          validator: /y[es]*|n[o]?/i,
          warning: 'Must respond yes or no',
          default: default_question
        } } }], function (err, result) {
      if (err) throw new Error(err);
      resolve(result.push.match(/y[es]?/i));
    });
  });
}

function get_tag_message(version) {
  return new Promise(function (resolve, reject) {
    var msg = 'what change is being made in ' + version + '?';
    prompt.start();
    prompt.get([{ properties: { tag: { message: msg.cyan } } }], function (err, result) {
      if (!err && result && result.tag) {
        resolve(result.tag);
      } else {
        reject(err || "Blank tags are not allowed. No changes were made");
      }
    });
  });
}
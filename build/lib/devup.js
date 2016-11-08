'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bump_version = bump_version;
exports.ensure_consistency = ensure_consistency;
exports.find_version = find_version;
exports.calculate_bump = calculate_bump;
exports.ensure_branch = ensure_branch;
exports.commit_to_git = commit_to_git;
exports.add_tag_to_git = add_tag_to_git;
exports.push_to_git = push_to_git;

var _immutable = require('immutable');

var _spawn_promise = require('./spawn_promise');

var _spawn_promise2 = _interopRequireDefault(_spawn_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fs = require('fs');
var buffer = require('buffer');
var XML = require('xml2js');
var XML_builder = new XML.Builder();
var XML_parser = new XML.Parser();

function bump_version() {
  var bump_type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'patch';
  var file = arguments[1];

  return find_version(file.location, file.extension, file.search).then(function (current_version) {
    return calculate_bump(current_version, bump_type);
  }).then(function (next_version) {
    return get_object_from_file(file.location, file.extension).then(function (file_contents) {
      return file_contents.setIn(file.search, next_version);
    }).then(function (updated_contents) {
      return write_object_to_file(updated_contents, file.location, file.extension);
    }).then(function (_) {
      return next_version;
    });
  });
}

function ensure_consistency(version, file) {
  for (var _len = arguments.length, remaining_files = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    remaining_files[_key - 2] = arguments[_key];
  }

  if (!file) return version;

  return find_version(file.location, file.extension, file.search).then(function (file_version) {
    if (version === undefined || file_version === version) {
      console.log('found ' + file_version + ' in ' + file.location);
      return ensure_consistency.apply(undefined, [file_version].concat(remaining_files));
    } else {
      throw new Error("File versions do not match. Found ${version} and ${file_version}. Please correct before proceeding. Failed on ${file.location}");
    }
  });
}

function find_version(location, extension, search) {
  return get_object_from_file(location, extension).then(function (parsed_contents) {
    return parsed_contents.getIn(search);
  });
}

function write_object_to_file(file_contents, location, extension) {
  var packed_contents = void 0;
  switch (extension) {
    case "xml":
      packed_contents = XML_builder.buildObject(file_contents);
      break;
    case "json":
      packed_contents = JSON.stringify(file_contents, null, '  ');
      break;
    default:
      throw new Error('Unknown extension ' + extension);
  }
  fs.writeFileSync(location, packed_contents);
}

function get_object_from_file(location, extension) {
  var parsed_contents = void 0;
  var file_contents = fs.readFileSync(location, 'utf8');
  switch (extension) {
    case "xml":
      parsed_contents = new Promise(function (resolve, reject) {
        XML_parser.parseString(file_contents, function (err, result) {
          if (err) reject(err);
          resolve(result);
        });
      });
      break;
    case "json":
      parsed_contents = JSON.parse(file_contents);
      break;
    default:
      throw new Error("Unknown extension ${extension}");
  }
  return Promise.resolve(parsed_contents).then(function (contents) {
    return (0, _immutable.Map)(contents);
  });
}

function calculate_bump(version, type) {
  var breakdown = version.match(/^(\d*)\.(\d*)\.(\d*)$/);
  switch (type) {
    case "major":
      breakdown[1] = parseInt(breakdown[1]) + 1;
      breakdown[2] = breakdown[3] = 0;
      break;
    case "minor":
      breakdown[2] = parseInt(breakdown[2]) + 1;
      breakdown[3] = 0;
      break;
    case "patch":
    default:
      breakdown[3] = parseInt(breakdown[3]) + 1;
      break;
  }
  return breakdown[1] + "." + breakdown[2] + "." + breakdown[3];
}

function ensure_branch(branch) {
  var branch_regex = new RegExp('\\* ' + branch);
  return (0, _spawn_promise2.default)('sh', '-c', 'git branch | grep \\*').then(function (current_branch) {
    if (!current_branch.match(branch_regex)) throw new Error("must be on the master branch to bump version numbers");
  });
}

function commit_to_git(message) {
  if (!message) throw new Error("error message is required when committing to git");

  for (var _len2 = arguments.length, files = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    files[_key2 - 1] = arguments[_key2];
  }

  var commit = _spawn_promise2.default.apply(undefined, ['git', 'commit'].concat(files, ['-m', message]));
}

function add_tag_to_git(version, message) {
  if (!message) throw new Error("error message is required when committing to git");
  return Promise.resolve(version).then(function (v) {
    return (0, _spawn_promise2.default)('git', 'tag', '-a', v, '-m', message);
  });
}

function push_to_git() {
  return (0, _spawn_promise2.default)('git', 'push').then(function () {
    return (0, _spawn_promise2.default)('git', 'push', '--tags');
  });
}
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

var fs = require('fs');
var buffer = require('buffer');
var XML = require('xml2js');
XML.stringify = new XML.Builder();

var spawn = require('child_process').spawn;

function bump_version() {
  var bump_type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'patch';
  var file = arguments[1];

  var current_version = find_version(file.location, file.extension, file.search);
  var next_version = calculate_bump(current_version, bump_type);
  var file_contents = get_object_from_file(file.location, file.extension);
  var updated_contents = file_contents.setIn(file.search, next_version);
  write_object_to_file(updated_contents, file.location, file.extension);
  return next_version;
}

function ensure_consistency(version, file) {
  if (!file) return version;

  var file_version = find_version(file.location, file.extension, file.search);
  if (version === undefined || file_version === version) {
    for (var _len = arguments.length, remaining_files = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      remaining_files[_key - 2] = arguments[_key];
    }

    return ensure_consistency.apply(undefined, [file_version].concat(remaining_files));
  } else {
    throw new Error("File versions do not match. Found ${version} and ${file_version}. Please correct before proceeding. Failed on ${file.location}");
  }
}

function find_version(location, extension, search) {
  var parsed_contents = get_object_from_file(location, extension);
  return parsed_contents.getIn(search);
}

function write_object_to_file(file_contents, location, extension) {
  var packed_contents = void 0;
  switch (extension) {
    case "xml":
      packed_contents = XML.stringify(file_contents);
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
  var file_contents = fs.readFileSync(location);
  switch (extension) {
    case "xml":
      parsed_contents = XML.parseString(file_contents);
      break;
    case "json":
      parsed_contents = JSON.parse(file_contents);
      break;
    default:
      throw new Error("Unknown extension ${extension}");
  }
  return (0, _immutable.Map)(parsed_contents);
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
  return spawn_promise('sh', '-c', 'git branch | grep \\*').then(function (current_branch) {
    if (!current_branch.match(branch_regex)) throw new Error("must be on the master branch to bump version numbers");
  });
}

function commit_to_git(message) {
  if (!message) throw new Error("error message is required when committing to git");

  for (var _len2 = arguments.length, files = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    files[_key2 - 1] = arguments[_key2];
  }

  var commit = spawn_promise.apply(undefined, ['git', 'commit'].concat(files, ['-m', message]));
}

function add_tag_to_git(version, message) {
  if (!message) throw new Error("error message is required when committing to git");
  return spawn_promise('git', 'tag', '-a', version, '-m', message);
}

function push_to_git() {
  return spawn_promise('git', 'push').then(function () {
    return spawn_promise('git', 'push', '--tags');
  });
}

function spawn_promise(command) {
  for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    args[_key3 - 1] = arguments[_key3];
  }

  var command_stream = spawn(command, args);

  return new Promise(function (resolve, reject) {
    var data = "";
    command_stream.stdout.on('data', function (chunk) {
      data += chunk;
    });

    command_stream.stderr.on('data', function (data) {
      console.warn(data.toString('utf8'));
    });

    command_stream.on('close', function (code) {
      command_stream.stdin.end();
      if (code !== 0) {
        var command_string = args.reduce(function (prev, cur) {
          return prev + ' ' + cur;
        }, command);
        throw new Error(command_string + ' failed with code ' + code);
      } else {
        resolve(data);
      }
    });
  });
}
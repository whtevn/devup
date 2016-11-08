'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = spawn_promise;

var spawn = require('child_process').spawn;
function spawn_promise(command) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
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
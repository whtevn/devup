#!/usr/bin/env node
import { Map, List } from 'immutable';

const fs = require('fs');

var args = require('yargs')
  , argv      = args.argv;

process.stdin.setEncoding('utf8');

import VersionBumper from '../lib/version_bumper.js';
var ChangelogPrinter = require('../lib/changelogger');

if(!argv._[0]){
  argv = args
    .usage("\nBump all the ".yellow+'.versions'.red+' in all your '.yellow+'.jsons'.cyan)
    .example('$0', 'bump all version numbers in all files described in your .devup file')
    .example('$0', 'bump patch version numbers. ie 0.0.X uses -t patch as default')
    .example('$0 -t patch', 'bump patch version numbers. ie 0.0.X')
    .example('$0 -t minor', 'bump minor version numbers. ie 0.X.0')
    .example('$0 -t major', 'bump major version numbers. ie X.0.0')
    .alias('t', 'type')
    .default('t', 'patch')
    .help('h')
    .alias('h', 'help')
    .argv

  const files = List(JSON.parse(fs.readFileSync('./.devup')));
  VersionBumper(argv.t, files);
}else{
  switch(argv._[0]){
    case "ch":
    case "changelog":
      argv = args
        .alias("o", "output")
        .default("o", "raw")
        .usage("\nBump all the ".yellow+'.versions'.red+' in all your '.yellow+'.jsons'.cyan)
        .example('$0 changelog', 'view all tags that have been made')
        .example('$0 ch', 'shortcut to view all tags that have been made')
        .example('$0 ch -o html', 'all tags, as an html table [ defaults to raw output ]')
        .example('$0 ch -o json', 'all tags, as a json array')
        .example('$0 ch 4', 'view all tags for either 4.x.x or 0.4.x or 0.0.4, depending on the tags available')
        .example('$0 ch -v 4', 'view all tags for either 4.x.x or 0.4.x or 0.0.4, depending on the tags available')
        .example('$0 ch --version 4', 'view all tags for either 4.x.x or 0.4.x or 0.0.4, depending on the tags available')
        .help('h')
        .alias('h', 'help')
        .example('$0 ch -v 4', 'view all tags for either 4.x.x or 0.4.x or 0.0.4, depending on the tags available')
        .argv
    ChangelogPrinter(argv._[1]||argv.v, argv.o)
      .then(function(result){
        result.forEach(function(result){
          process.stdout.write(result+"\n");
        });
      });
  }
}


/*
changelog info:

git tag -l -n9 [search]

e.g. git -l -n9 0.*

search should be like:

devup changelog 44

should find 0.44.* if no 44 exists
44.* if it does exist
*/

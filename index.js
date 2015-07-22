#!/usr/bin/env node
var fs = require('q-io/fs');
var confoo = require('confoo');
var Q = require('q');
var path = require('path');
var exec = require('exec-as-promised')();
var prompt = require('prompt');
prompt.message = "";
prompt.delimiter = "";

var file_list = fs.list('.');

var version_found = file_list.then(validateUpdate)

var tag_message_made = version_found.then(requestTagMessage)

var version_info = Q.all([version_found, tag_message_made])

version_info
  .then(function(){
    return file_list
  })
  .then(updateVersions)
  .then(commitLocalChanges)
  .then(function(){
    return version_info
  })
  .then(createLocalTag)
  .catch(function(err){
    console.log(err.stack);
  });

function getLocalFileList(){
  return fs.list('.');
}

function commitLocalChanges(version){
  return exec('git commit -am "bumping version numbers"')
    .then(function(){
      return version;
    });
}

function requestTagMessage(version){
  var deferred = Q.defer();

  var msg = 'what was the change in version '+version+'?'
  prompt.start()
  prompt.get([{properties: {tag: {message: msg.green}}}], function(err, result){
    if(err) deferred.reject(err);

    deferred.resolve(result.tag);
  })

  return deferred.promise
}

function createLocalTag(info){
  var version = info[0];
  var message = info[1];
  return exec('git tag -a '+version+' -m "'+message+'"');
}

function updateVersions(list, entry){
  entry = (entry || 0);
  var item = list[entry];
  return item && changeVersion(item)
    .then(function(){
      return updateVersions(list, entry+1);
    })
}

function changeVersion(item){
  var deferred = Q.defer();
  fs.isFile(item)
    .then(function(is_file){
      if(is_file && item.match(/\.json$/)){
        return fs.read(item)
          .then(function(contents){
            return JSON.parse(contents);
          })
      }else{
        return {}
      }
    })
    .then(function(contents){
      if(contents.version){
        new_version_number = bumpVersion(contents.version);
        contents.version = new_version_number
        return fs.write(item, JSON.stringify(contents, null, "\t"))
          .then(function(){
            return contents.version;
          })
      }
    })
    .then(function(){
      deferred.resolve();
    })
    .catch(function(err){
      deferred.reject(err);
    })
    return deferred.promise;
}

function validateUpdate(list, version, entry){
  entry = (entry || 0);
  var item = list[entry];
  if(!item) return version;

  return checkVersionConsistency(item, version)
    .then(function(version){
      return validateUpdate(list, version, entry+1);
    })
}

function checkVersionConsistency(item, version){
  var deferred = Q.defer();
  if(!item) deferred.reject("no such item");
  fs.read(item)
    .then(function(contents){
      contents = JSON.parse(contents)
      new_version_number = bumpVersion(contents.version);
      if(version && contents.version && new_version_number != version){
        deferred.reject("version numbers are out of sync")
      }else{
        deferred.resolve(new_version_number || version);
      }
    })
    .catch(function(){
      deferred.resolve(version);
    })
  return deferred.promise
}

function bumpVersion(version){
  breakdown = version.match(/^(\d*)\.(\d*)\.(\d*)$/);
  breakdown[3] = parseInt(breakdown[3])+1;
  return breakdown[1]+"."+breakdown[2]+"."+breakdown[3]
}

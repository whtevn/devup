const minimist = require('minimist');
const fs = require('fs');
const shellescape = require('shell-escape');
import * as devup from '../lib/devup'
var prompt = require('prompt');
prompt.message = "";
prompt.delimiter = "";

export default function VersionBumper(bump_type, files){

  const file_locations = files.map(file => file.location);

  let message;
  let next_version;
  devup.ensure_consistency(undefined, ...files)
    .then(function(current_version){
      return devup.calculate_bump(current_version, bump_type); 
    })
    .then((updated_version) => {
      devup.ensure_branch("master")
      next_version = updated_version
      return next_version
    })
    .then((next_version) => get_tag_message(next_version))
    .then((user_response) => message = shellescape([user_response]))
    .then(() => next_version = devup.bump_version(bump_type, ...files))
    .then(() => ask_question("would you like to commit these changes locally?", "yes"))
    .then((response) => {
      if(!response){
        console.log("version numbers have been updated locally. changes have not been committed");
        process.exit(0);
      }
    })
    .then(() => devup.commit_to_git(`bumping version numbers to ${next_version} - ${message}`, ...file_locations))
    .then(() => devup.add_tag_to_git(next_version, message))
    .then(() => ask_question("would you like to push your changes to origin?", "yes"))
    .then((response) => {
      if(!response){
        console.log("your local branch has been updated and a tag has been created, but they have not been pushed to origin");
        process.exit(0);
      }
    })
    .then(() => devup.push_to_git(next_version, message))
    .catch((err) => {
      console.log(err)
      process.exit(1)
    })
    ;
}

function ask_question(question, default_question){
  var msg = `\n${question}`;
  return new Promise((resolve, reject) => {
    prompt.start()
    prompt.get([{properties: {push: {
      message: msg.cyan,
      validator: /y[es]*|n[o]?/i,
      warning: 'Must respond yes or no',
      default: default_question
    }}}], function(err, result){
      if(err) throw new Error(err);
      resolve(result.push.match(/y[es]?/i));
    })
  })
}

function get_tag_message(version){
  return new Promise((resolve, reject) => {
    var msg = `what change is being made in ${version}?`;
    prompt.start()
    prompt.get([{properties: {tag: {message: msg.cyan}}}], function(err, result){
      if(!err && result && result.tag){
        resolve(result.tag);
      }else{
        reject(err || "Blank tags are not allowed. No changes were made");
      }
    })
  })

}

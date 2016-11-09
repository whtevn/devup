import Immutable from 'immutable';
import spawn_promise from './spawn_promise';

const fs       = require('fs');
const buffer   = require('buffer');
const XML      = require('xml2js');
const XML_builder = new XML.Builder();
const XML_parser  = new XML.Parser();


export function bump_version(bump_type='patch', file, ...remaining){
  return find_version(file.location, file.extension, file.search)
    .then(current_version => calculate_bump(current_version, bump_type))
    .then(next_version => {
      return get_object_from_file(file.location, file.extension)
        .then(file_contents => file_contents.setIn(file.search, next_version))
        .then(updated_contents => write_object_to_file(updated_contents, file.location, file.extension))
        .then(_ => next_version)
    })
    .then((next_version) => {
      if(remaining.length > 0){
        return bump_version(bump_type, ...remaining);
      }else{
        return next_version;
      }
    })

}

export function ensure_consistency(version, file, ...remaining_files){
  if(!file) return version;

  return find_version(file.location, file.extension, file.search)
           .then((file_version) => {
              if(version === undefined || file_version === version){
                console.log(`found ${file_version} in ${file.location}`);
                return ensure_consistency(file_version, ...remaining_files);
              }else{
                throw new Error(`File versions do not match. Found ${version} and ${file_version}. Please correct before proceeding. Failed on ${file.location}`);
              }
           })
}

export function find_version(location, extension, search){
  return get_object_from_file(location, extension)
          .then(parsed_contents => parsed_contents.getIn(search));
}

function write_object_to_file(file_contents, location, extension){
  let packed_contents;
  const js_contents = file_contents.toJS();
  switch(extension){
    case "xml":
      packed_contents = XML_builder.buildObject(js_contents);
      break;
    case "json":
      packed_contents = JSON.stringify(js_contents, null, '  ');
      break;
    default:
      throw new Error(`Unknown extension ${extension}`);
  }
  fs.writeFileSync(location, packed_contents);
}

function get_object_from_file(location, extension){
  let parsed_contents;
  const file_contents = fs.readFileSync(location, 'utf8');
  switch(extension){
    case "xml":
      parsed_contents = new Promise((resolve, reject) => {
        XML_parser.parseString(file_contents, function(err,result){
          if(err) reject(err);
          resolve(result)
        });
      })
      break;
    case "json":
      parsed_contents = JSON.parse(file_contents);
      break;
    default:
      throw new Error(`Unknown extension ${extension}`);
  }
  return Promise.resolve(parsed_contents).then((contents) => Immutable.fromJS(contents))
}

export function calculate_bump(version, type){
  const breakdown = version.match(/^(\d*)\.(\d*)\.(\d*)$/);
  switch(type){
    case "major":
      breakdown[1] = parseInt(breakdown[1])+1;
      breakdown[2] = breakdown[3] = 0;
      break
    case "minor":
      breakdown[2] = parseInt(breakdown[2])+1;
      breakdown[3] = 0;
      break
    case "patch":
    default :
      breakdown[3] = parseInt(breakdown[3])+1;
      break
  }
  return breakdown[1]+"."+breakdown[2]+"."+breakdown[3]
}

export function ensure_branch(branch){
  const branch_regex = new RegExp(`\\* ${branch}`);
  return spawn_promise('sh', '-c', `git branch | grep \\*`)
          .then((current_branch) => {
            if(!current_branch.match(branch_regex)) throw new Error("must be on the master branch to bump version numbers")
          })
}

export function commit_to_git(message, ...files){
  if(!message) throw new Error("error message is required when committing to git");
  const commit = spawn_promise('git', 'commit', ...files, '-m', message);
}

export function add_tag_to_git(version, message){
  if(!message) throw new Error("error message is required when committing to git");
  return Promise.resolve(version)
            .then(v => spawn_promise('git', 'tag', '-a', v, '-m', message));
}

export function push_to_git(){
  return spawn_promise('git', 'push')
          .then(()=>spawn_promise('git', 'push', '--tags'))
}


import { Map, List } from 'immutable';

const fs       = require('fs');
const buffer   = require('buffer');
const XML      = require('xml2js');
XML.stringify  = new XML.Builder();

const spawn = require('child_process').spawn;

export function bump_version(bump_type='patch', file, ...remaining){
  const current_version  = find_version(file.location, file.extension, file.search);
  const next_version     = calculate_bump(current_version, bump_type);
  const file_contents    = get_object_from_file(file.location, file.extension);
  const updated_contents = file_contents.setIn(file.search, next_version);
  write_object_to_file(updated_contents, file.location, file.extension);
  return next_version;
}

export function ensure_consistency(version, file, ...remaining_files){
  if(!file) return version;

  const file_version = find_version(file.location, file.extension, file.search);
  if(version === undefined || file_version === version){
    return ensure_consistency(file_version, ...remaining_files);
  }else{
    throw new Error("File versions do not match. Found ${version} and ${file_version}. Please correct before proceeding. Failed on ${file.location}");
  }
}

export function find_version(location, extension, search){
  const parsed_contents = get_object_from_file(location, extension);
  return parsed_contents.getIn(search);
}

function write_object_to_file(file_contents, location, extension){
  let packed_contents;
  switch(extension){
    case "xml":
      packed_contents = XML.stringify(file_contents);
      break;
    case "json":
      packed_contents = JSON.stringify(file_contents, null, '  ');
      break;
    default:
      throw new Error(`Unknown extension ${extension}`);
  }
  fs.writeFileSync(location, packed_contents);
}

function get_object_from_file(location, extension){
  let parsed_contents;
  const file_contents = fs.readFileSync(location);
  switch(extension){
    case "xml":
      parsed_contents = XML.parseString(file_contents);
      break;
    case "json":
      parsed_contents = JSON.parse(file_contents);
      break;
    default:
      throw new Error("Unknown extension ${extension}");
  }
  return Map(parsed_contents);
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
  return spawn_promise('git', 'tag', '-a', version, '-m', message);
}

export function push_to_git(){
  return spawn_promise('git', 'push')
          .then(()=>spawn_promise('git', 'push', '--tags'))
}

function spawn_promise(command, ...args){

  const command_stream = spawn(command, args);

  return new Promise((resolve, reject) => {
    let data = "";
    command_stream.stdout.on('data', (chunk) => {
      data += chunk;
    });

    command_stream.stderr.on('data', (data) => {
      console.warn(data.toString('utf8'));
    });

    command_stream.on('close', (code) => {
      command_stream.stdin.end();
      if (code !== 0) {
        const command_string = args.reduce((prev, cur) => `${prev} ${cur}`, command)
        throw new Error(`${command_string} failed with code ${code}`);
      }else{
        resolve(data);
      }
    });
  })
}

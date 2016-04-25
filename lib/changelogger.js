var exec = require('exec-as-promised')();
module.exports = function(filter, output){
  return exec("git tag -l -n9")
    .then(sort_results)
    .then(function(results){
      return filter_results(results, filter);
    })
    .then(function(results){
      if(output === "html"){
        var html = results.map(function(tag){
          tag = tag.match(/^([^\s]*)\s+([\s].*)$/)
          return "<tr><td>"+tag[1]+"</td><td>"+tag[2]+"</td></tr>"
        })
        results = "<table>\n"+html.join("\n")+"\n</table>"
      }
      return results;
    })
}

function filter_results(results, filter){
  return results.filter(function(item){
    return  item.match(filter);
  })
}

function semver_info(item){
  var item_info = item.match(/^(\d*\.\d*\.\d*)\s*(.*$)/);
  return item_info[1].match(/^(\d*)\.(\d*)\.(\d*)/);
}

function sort_results(result){
  result = result
            .split("\n")
            .filter(function(item){
              return item
            });
  return result.sort(function(a, b){
    b = b||"0.0.0";
    a = a||"0.0.0";
    var a_version_semver = semver_info(a);
    var b_version_semver = semver_info(b);
    a_version_semver = a_version_semver.map(function(item){
      return parseInt(item);
    })
    b_version_semver = b_version_semver.map(function(item){
      return parseInt(item);
    })

    if(a_version_semver[1] == b_version_semver[1] &&
      a_version_semver[2] == b_version_semver[2] &&
      a_version_semver[3] == b_version_semver[3]){
        result = 0;
    }else if(
      (a_version_semver[1] > b_version_semver[1]) ||
      (a_version_semver[1] == b_version_semver[1] && a_version_semver[2] > b_version_semver[2]) ||
      (a_version_semver[1] == b_version_semver[1] && a_version_semver[2] == b_version_semver[2] && a_version_semver[3] > b_version_semver[3])
    ){
      result = 1;
    }else if(
      (a_version_semver[1] < b_version_semver[1]) ||
      (a_version_semver[1] == b_version_semver[1] && a_version_semver[2] < b_version_semver[2]) ||
      (a_version_semver[1] == b_version_semver[1] && a_version_semver[2] == b_version_semver[2] && a_version_semver[3] < b_version_semver[3])
    ){
      result = -1;
    }
    return result;
  })
}

function create_ordered_array(versions){
}

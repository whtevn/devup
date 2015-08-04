devup
-----

Bump all the .versions in all your .jsons and make a tag with a message

    npm install devup -g

Run with:

    $ devup

must be run in the top level of your project (or with all of your versioned .json files. all .json files must be in the same directory)

### you may cancel at the time of tag message request with no fear. all changes stay local until you choose to push them.

Options:

    -h, --help  Show help                                                [boolean]


todo: 
  - escape messages so that special characters can be used
  - catch things after the version numbers have been updated so that they can be rolled back if the deal fails
  - error out if no files with version numbers are found on validation


const spawn = require('child_process').spawn;
export default function spawn_promise(command, ...args){

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

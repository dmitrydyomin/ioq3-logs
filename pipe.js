const net = require('net');
const readline = require('readline');

/**
 * @type net.Socket[]
 */
let connections = [];

const server = net.createServer((c) => {
  // console.log('client connected');
  connections.push(c);
  c.on('end', () => {
    // console.log('client disconnected');
    connections = connections.filter(i => i !== c);
  });
});

server.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

server.listen(3000);

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

rl.on('line', function (line) {
  connections.forEach(c => c.write(line + '\n'));
});

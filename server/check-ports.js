import { Client } from 'ssh2';

const conn = new Client();

console.log('Checking active ports and listening processes on server...');

conn.on('ready', () => {
  conn.exec('netstat -tulnp || ss -tulnp', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    });
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: '212.90.121.97',
  port: 22,
  username: 'root',
  password: 'Somepass2026'
});

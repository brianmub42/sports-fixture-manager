import { Client } from 'ssh2';

const conn = new Client();

console.log('Searching Nginx config for port 8085...');

conn.on('ready', () => {
  conn.exec('grep -rn "8085" /etc/nginx/', (err, stream) => {
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

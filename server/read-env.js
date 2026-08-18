import { Client } from 'ssh2';

const conn = new Client();

console.log('Reading live server .env file...');

conn.on('ready', () => {
  conn.exec('cat /var/www/sports-fixture-manager/server/.env', (err, stream) => {
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

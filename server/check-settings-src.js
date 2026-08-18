import { Client } from 'ssh2';

const conn = new Client();

console.log('Searching remote source Settings.jsx for "Points Allocation"...');

conn.on('ready', () => {
  conn.exec('grep -n "Points Allocation" /var/www/sports-fixture-manager/client/src/pages/Settings.jsx 2>/dev/null', (err, stream) => {
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
  password: 'Somepass2026',
  readyTimeout: 15000
});

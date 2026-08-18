import { Client } from 'ssh2';

const conn = new Client();

console.log('Searching remote compiled dist/ files for "Points Allocation"...');

conn.on('ready', () => {
  conn.exec('grep -rn "Points Allocation" /var/www/sports-fixture-manager/client/dist/ 2>/dev/null | head -n 5', (err, stream) => {
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

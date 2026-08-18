import { Client } from 'ssh2';

const conn = new Client();

console.log('Searching live server for database backups...');

conn.on('ready', () => {
  conn.exec('find / -name "*.sql" -o -name "*backup*" -type f 2>/dev/null | grep -v "node_modules" | head -n 50', (err, stream) => {
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

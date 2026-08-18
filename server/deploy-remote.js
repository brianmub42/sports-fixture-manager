import { Client } from 'ssh2';

const conn = new Client();

console.log('Connecting to server 212.90.121.97 via SSH...');

conn.on('ready', () => {
  console.log('SSH Connection established successfully!');
  console.log('Executing deployment commands on the live server...');

  const commands = [
    'cd /var/www/sports-fixture-manager',
    'git remote remove origin || true',
    'git remote add origin https://github.com/brianmub42/sports-fixture-manager.git',
    'git fetch origin',
    'git reset --hard origin/main',
    'npm run install:all',
    'npm run build',
    'cd server',
    'pm2 restart kalife-backend || pm2 start ecosystem.config.cjs'
  ];

  const fullCommand = commands.join(' && ');

  conn.exec(fullCommand, (err, stream) => {
    if (err) {
      console.error('Execution error:', err);
      conn.end();
      process.exit(1);
    }

    stream.on('close', (code, signal) => {
      console.log(`\nDeployment finished with exit code: ${code}`);
      if (signal) console.log(`Signal: ${signal}`);
      conn.end();
      process.exit(code === 0 ? 0 : 1);
    });

    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection failed:', err.message);
  process.exit(1);
}).connect({
  host: '212.90.121.97',
  port: 22,
  username: 'root',
  password: 'Somepass2026'
});

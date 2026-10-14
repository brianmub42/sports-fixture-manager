import { Client } from 'ssh2';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const conn = new Client();

console.log('Connecting to VPS 212.90.121.97...');

conn.on('ready', () => {
  console.log('SSH connection established.');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      process.exit(1);
    }

    const filesToUpload = [
      {
        local: path.join(projectRoot, 'client', 'package.json'),
        remote: '/var/www/sports-fixture-manager/client/package.json'
      },
      {
        local: path.join(projectRoot, 'client', 'package-lock.json'),
        remote: '/var/www/sports-fixture-manager/client/package-lock.json'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'components', 'SpectatorQrModal.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/components/SpectatorQrModal.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'components', 'Layout.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/components/Layout.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'pages', 'Dashboard.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/pages/Dashboard.jsx'
      }
    ];

    let completed = 0;
    const uploadNext = (index) => {
      if (index >= filesToUpload.length) {
        console.log('All source files uploaded via SFTP successfully!');
        runRemoteBuild();
        return;
      }

      const item = filesToUpload[index];
      console.log(`Uploading ${path.basename(item.local)} -> ${item.remote}...`);
      sftp.fastPut(item.local, item.remote, (putErr) => {
        if (putErr) {
          console.error(`Error uploading ${item.local}:`, putErr);
          conn.end();
          process.exit(1);
        }
        uploadNext(index + 1);
      });
    };

    uploadNext(0);

    function runRemoteBuild() {
      console.log('Installing qrcode.react and building client on remote server...');
      const remoteCmd = `
        cd /var/www/sports-fixture-manager/client &&
        npm install qrcode.react --save &&
        npm run build &&
        pm2 restart kalife-backend || true
      `.trim();

      conn.exec(remoteCmd, (execErr, stream) => {
        if (execErr) {
          console.error('Remote exec error:', execErr);
          conn.end();
          process.exit(1);
        }

        stream.on('close', (code) => {
          console.log(`\nRemote build and restart completed with exit code: ${code}`);
          conn.end();
          process.exit(code === 0 ? 0 : 1);
        });

        stream.on('data', (d) => process.stdout.write(d.toString()));
        stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
      });
    }
  });
}).on('error', (err) => {
  console.error('SSH Connection failed:', err.message);
  process.exit(1);
}).connect({
  host: '212.90.121.97',
  port: 22,
  username: 'root',
  password: 'Somepass2026',
  readyTimeout: 20000
});

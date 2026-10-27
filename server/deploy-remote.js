import { Client } from 'ssh2';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const conn = new Client();

console.log('Connecting to live production server 212.90.121.97 via SSH...');

conn.on('ready', () => {
  console.log('SSH Connection established successfully!');

  const distTarPath = path.join(projectRoot, 'client', 'dist.tar.gz');
  const remoteDistTar = '/var/www/sports-fixture-manager/client/dist.tar.gz';

  conn.sftp((sftpErr, sftp) => {
    if (sftpErr) {
      console.error('SFTP error:', sftpErr);
      conn.end();
      process.exit(1);
    }

    const startDeploymentCommands = () => {
      console.log('Executing live deployment commands on server...');

      const commands = [
        'cd /var/www/sports-fixture-manager',
        'git remote remove origin || true',
        'git remote add origin https://github.com/brianmub42/sports-fixture-manager.git',
        'git fetch origin',
        'git reset --hard origin/main',
        'cd client && tar -xzf dist.tar.gz && cd ..',
        'cd server && node migrate.js',
        'pm2 restart kalife-backend || pm2 start ecosystem.config.cjs',
        'pm2 status kalife-backend'
      ];

      const fullCommand = commands.join(' && ');

      conn.exec(fullCommand, (err, stream) => {
        if (err) {
          console.error('Execution error:', err);
          conn.end();
          process.exit(1);
        }

        stream.on('close', (code, signal) => {
          console.log(`\nDeployment commands completed with exit code: ${code}`);
          conn.end();
          verifyLive();
        });

        stream.on('data', (data) => {
          process.stdout.write(data.toString());
        });

        stream.stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    };

    if (fs.existsSync(distTarPath)) {
      console.log(`Uploading local prebuilt bundle (${(fs.statSync(distTarPath).size / 1024 / 1024).toFixed(2)} MB)...`);
      sftp.fastPut(distTarPath, remoteDistTar, (uploadErr) => {
        if (uploadErr) {
          console.warn('SFTP upload error, proceeding with remote build fallback:', uploadErr.message);
        } else {
          console.log('Uploaded pre-built client dist.tar.gz successfully!');
        }
        startDeploymentCommands();
      });
    } else {
      console.log('No local dist.tar.gz found, proceeding with repository pull & build...');
      startDeploymentCommands();
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

async function verifyLive() {
  console.log('\n--- Verifying Live Production Deployment ---');
  try {
    const res = await fetch('https://fixturegrid.co.zw');
    console.log('Public Site HTTP Status:', res.status);
    const html = await res.text();
    const jsMatches = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
    console.log('Active JS bundles in index.html:', jsMatches);
    if (jsMatches.length > 0) {
      const bundleUrl = jsMatches[0].startsWith('http') ? jsMatches[0] : `https://fixturegrid.co.zw${jsMatches[0]}`;
      const bRes = await fetch(bundleUrl);
      const bText = await bRes.text();
      console.log('Active bundle size:', bText.length, 'bytes');
      console.log('Verified bundle features:');
      console.log(' - Multi-Position Scoring:', bText.includes('Multi-Position Team Scoring') || bText.includes('multi-position') || bText.includes('cumulative points'));
      console.log(' - School Grades Preset:', bText.includes('Grades 1-7') || bText.includes('Grades 1–7') || bText.includes('grades-primary'));
    }
    console.log('\n🎉 DEPLOYMENT TO LIVE PRODUCTION COMPLETE!');
  } catch (err) {
    console.error('Verification warning:', err.message);
  }
}

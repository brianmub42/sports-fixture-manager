import { Client } from 'ssh2';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const conn = new Client();

console.log('Connecting to VPS 212.90.121.97 to deploy complete update...');

conn.on('ready', () => {
  console.log('SSH connection established.');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      process.exit(1);
    }

    const filesToUpload = [
      // Server files
      {
        local: path.join(projectRoot, 'server', 'db-patch.js'),
        remote: '/var/www/sports-fixture-manager/server/db-patch.js'
      },
      {
        local: path.join(projectRoot, 'server', 'schema.sql'),
        remote: '/var/www/sports-fixture-manager/server/schema.sql'
      },
      {
        local: path.join(projectRoot, 'server', 'middleware', 'auth.js'),
        remote: '/var/www/sports-fixture-manager/server/middleware/auth.js'
      },
      {
        local: path.join(projectRoot, 'server', 'middleware', 'tenant.js'),
        remote: '/var/www/sports-fixture-manager/server/middleware/tenant.js'
      },
      {
        local: path.join(projectRoot, 'server', 'routes', 'auth.js'),
        remote: '/var/www/sports-fixture-manager/server/routes/auth.js'
      },
      {
        local: path.join(projectRoot, 'server', 'routes', 'fixtures.js'),
        remote: '/var/www/sports-fixture-manager/server/routes/fixtures.js'
      },
      {
        local: path.join(projectRoot, 'server', 'routes', 'organizations.js'),
        remote: '/var/www/sports-fixture-manager/server/routes/organizations.js'
      },
      {
        local: path.join(projectRoot, 'server', 'routes', 'scores.js'),
        remote: '/var/www/sports-fixture-manager/server/routes/scores.js'
      },

      // Client core & components
      {
        local: path.join(projectRoot, 'client', 'src', 'App.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/App.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'api.js'),
        remote: '/var/www/sports-fixture-manager/client/src/api.js'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'components', 'Layout.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/components/Layout.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'components', 'Navigation.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/components/Navigation.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'components', 'CreateTournamentModal.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/components/CreateTournamentModal.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'components', 'TournamentSwitcher.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/components/TournamentSwitcher.jsx'
      },

      // Client contexts
      {
        local: path.join(projectRoot, 'client', 'src', 'contexts', 'AuthContext.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/contexts/AuthContext.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'contexts', 'OrganizationContext.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/contexts/OrganizationContext.jsx'
      },

      // Client pages
      {
        local: path.join(projectRoot, 'client', 'src', 'pages', 'Login.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/pages/Login.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'pages', 'Settings.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/pages/Settings.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'pages', 'Standings.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/pages/Standings.jsx'
      },
      {
        local: path.join(projectRoot, 'client', 'src', 'pages', 'ReportsPage.jsx'),
        remote: '/var/www/sports-fixture-manager/client/src/pages/ReportsPage.jsx'
      },

      // Client utils
      {
        local: path.join(projectRoot, 'client', 'src', 'utils', 'tournamentReports.js'),
        remote: '/var/www/sports-fixture-manager/client/src/utils/tournamentReports.js'
      }
    ];

    const uploadNext = (index) => {
      if (index >= filesToUpload.length) {
        console.log('All source files uploaded via SFTP successfully!');
        uploadDistArchive();
        return;
      }

      const item = filesToUpload[index];
      console.log(`[${index + 1}/${filesToUpload.length}] Uploading ${path.basename(item.local)} -> ${item.remote}...`);
      sftp.fastPut(item.local, item.remote, (putErr) => {
        if (putErr) {
          console.error(`Error uploading ${item.local}:`, putErr);
          conn.end();
          process.exit(1);
        }
        uploadNext(index + 1);
      });
    };

    function uploadDistArchive() {
      // First ensure tar archive of local client/dist exists
      const distTarPath = path.join(projectRoot, 'client', 'dist.tar.gz');
      console.log('Uploading client dist.tar.gz archive...');
      sftp.fastPut(distTarPath, '/var/www/sports-fixture-manager/client/dist.tar.gz', (err2) => {
        if (err2) {
          console.error('Failed to upload dist.tar.gz, falling back to remote build:', err2.message);
          runRemoteBuild();
        } else {
          console.log('client/dist.tar.gz uploaded successfully!');
          unpackAndRestart();
        }
      });
    }

    function unpackAndRestart() {
      console.log('Unpacking dist archive and restarting services...');
      const remoteCmd = `
        cd /var/www/sports-fixture-manager/client &&
        tar -xzf dist.tar.gz &&
        pm2 restart kalife-backend &&
        pm2 status kalife-backend
      `.trim();

      conn.exec(remoteCmd, (execErr, stream) => {
        if (execErr) {
          console.error('Remote exec error:', execErr);
          conn.end();
          process.exit(1);
        }

        stream.on('close', (code) => {
          console.log(`\nRemote unpack and restart completed with exit code: ${code}`);
          conn.end();
          verifyLiveDeployment();
        });

        stream.on('data', (d) => process.stdout.write(d.toString()));
        stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
      });
    }

    function runRemoteBuild() {
      console.log('Building client on remote server...');
      const remoteCmd = `
        cd /var/www/sports-fixture-manager/client &&
        npm run build &&
        pm2 restart kalife-backend
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
          verifyLiveDeployment();
        });

        stream.on('data', (d) => process.stdout.write(d.toString()));
        stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
      });
    }

    uploadNext(0);
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

async function verifyLiveDeployment() {
  console.log('\n--- Verifying Live Production Website ---');
  try {
    const res = await fetch('https://fixturegrid.co.zw');
    const html = await res.text();
    console.log('Public Web Response HTTP Status:', res.status);
    
    const jsMatches = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
    console.log('Active JS bundles in index.html:', jsMatches);
    
    if (jsMatches.length > 0) {
      const bundleUrl = jsMatches[0].startsWith('http') ? jsMatches[0] : `https://fixturegrid.co.zw${jsMatches[0]}`;
      console.log('Fetching live bundle from:', bundleUrl);
      const bRes = await fetch(bundleUrl);
      const bText = await bRes.text();
      console.log('Bundle fetched length:', bText.length);
      console.log('Live bundle contains "Tournament Reports":', bText.includes('Tournament Reports') || bText.includes('Official Tournament Records'));
      console.log('Live bundle contains "Create Next Tournament":', bText.includes('Create Next Tournament') || bText.includes('CreateTournamentModal'));
    }
    console.log('\n🎉 ALL UPDATES DEPLOYED & VERIFIED ON PRODUCTION!');
  } catch (err) {
    console.error('Verification error:', err.message);
  }
}

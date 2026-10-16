import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection ready.');
  conn.exec('grep -o "Spectator QR" /var/www/sports-fixture-manager/client/dist/assets/*.js | head -n 5', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log('Remote dist grep:', d.toString().trim()));
    stream.on('close', () => {
      conn.exec('pm2 status kalife-backend', (e2, s2) => {
        s2.on('data', d => console.log('PM2 status:\n', d.toString().trim()));
        s2.on('close', () => {
          conn.end();
          checkPublicWeb();
        });
      });
    });
  });
}).connect({
  host: '212.90.121.97',
  port: 22,
  username: 'root',
  password: 'Somepass2026'
});

async function checkPublicWeb() {
  try {
    const res = await fetch('https://fixturegrid.co.zw');
    const html = await res.text();
    console.log('Public Web Response HTTP Status:', res.status);
    
    // Find JS script tags in HTML
    const jsMatches = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
    console.log('Active JS bundles in index.html:', jsMatches);
    
    if (jsMatches.length > 0) {
      const bundleUrl = jsMatches[0].startsWith('http') ? jsMatches[0] : `https://fixturegrid.co.zw${jsMatches[0]}`;
      console.log('Fetching live bundle from:', bundleUrl);
      const bRes = await fetch(bundleUrl);
      const bText = await bRes.text();
      const hasQrFeature = bText.includes('Spectator QR');
      console.log('Live bundle contains "Spectator QR":', hasQrFeature);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

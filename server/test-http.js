import http from 'http';

console.log('Sending request to /api/health...');
http.get('http://localhost:3000/api/health', (res) => {
  console.log('Health status code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Health data:', data));
}).on('error', (err) => console.error('Health error:', err));

console.log('Sending request to /api/public/events/bible-temple-primary-school...');
http.get('http://localhost:3000/api/public/events/bible-temple-primary-school', (res) => {
  console.log('Public event status code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Public event data:', data));
}).on('error', (err) => console.error('Public event error:', err));

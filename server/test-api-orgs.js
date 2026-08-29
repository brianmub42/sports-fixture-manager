import http from 'http';

http.get('http://localhost:3000/api/organizations', (res) => {
  let data = '';
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('BODY:', data);
  });
}).on('error', (err) => {
  console.error('API REQUEST ERROR:', err);
});

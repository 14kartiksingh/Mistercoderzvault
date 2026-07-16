const http = require('http');

const request = (method, path, data = null, cookie = null) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (cookie) options.headers['Cookie'] = cookie;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let parsed = {};
        try {
          parsed = JSON.parse(body || '{}');
        } catch (e) {
          console.error('Failed to parse JSON. Raw body:', body.substring(0, 200));
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

(async () => {
  try {
    console.log('\n--- TESTING REVISIONS ---');
    console.log('1. Login with plain text password from .env (admin / password123)');
    let login = await request('POST', '/api/auth/login', { username: 'admin', password: 'password123' });
    console.log('Login status (expect 200):', login.statusCode);
    
    let tokenCookie = login.headers['set-cookie'] ? login.headers['set-cookie'][0].split(';')[0] : '';
    console.log('Token received:', !!tokenCookie);

    console.log('\n2. Change Password (admin / password123 -> newPassword456)');
    let changeReq = await request('POST', '/api/auth/change-password', { 
      currentPassword: 'password123', 
      newPassword: 'newPassword456' 
    }, tokenCookie);
    console.log('Change Password status (expect 200):', changeReq.statusCode);

    console.log('\n3. Login with OLD password (admin / password123)');
    let oldLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'password123' });
    console.log('Old Login status (expect 401):', oldLogin.statusCode);

    console.log('\n4. Login with NEW password (admin / newPassword456)');
    let newLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'newPassword456' });
    console.log('New Login status (expect 200):', newLogin.statusCode);
    tokenCookie = newLogin.headers['set-cookie'] ? newLogin.headers['set-cookie'][0].split(';')[0] : '';

    console.log('\n5. Restore Original Password (newPassword456 -> password123)');
    let restoreReq = await request('POST', '/api/auth/change-password', { 
      currentPassword: 'newPassword456', 
      newPassword: 'password123' 
    }, tokenCookie);
    console.log('Restore Password status (expect 200):', restoreReq.statusCode);

  } catch (err) {
    console.error(err);
  }
})();

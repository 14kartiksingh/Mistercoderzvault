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
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: JSON.parse(body || '{}'),
        });
      });
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

(async () => {
  try {
    console.log('1. Testing Public Route (GET /api/assets)');
    const pub = await request('GET', '/api/assets');
    // 500 expected because DB isn't running, but NOT 401
    console.log('Public route status (expect 500, not 401):', pub.statusCode);

    console.log('\n2. Testing Protected Route Without Auth (POST /api/assets)');
    const unauth = await request('POST', '/api/assets', {});
    console.log('Protected route without auth status (expect 401):', unauth.statusCode);
    
    console.log('\n3. Testing Successful Login');
    const login = await request('POST', '/api/auth/login', { username: 'admin', password: 'password123' });
    console.log('Login status (expect 200):', login.statusCode);
    const setCookie = login.headers['set-cookie'] ? login.headers['set-cookie'][0] : '';
    console.log('Set-Cookie header present:', !!setCookie);
    const tokenCookie = setCookie.split(';')[0];

    console.log('\n4. Testing Protected Route With Auth (POST /api/assets)');
    const authReq = await request('POST', '/api/assets', {}, tokenCookie);
    // 400 expected because body is missing required fields (validation happens before DB)
    console.log('Protected route with auth status (expect 400):', authReq.statusCode);

    console.log('\n5. Testing Logout');
    const logout = await request('POST', '/api/auth/logout', null, tokenCookie);
    console.log('Logout status (expect 200):', logout.statusCode);
    console.log('Cookie cleared:', logout.headers['set-cookie'][0].includes('Expires=Thu, 01 Jan 1970'));

    console.log('\n6. Testing Rate Limiter');
    let rateLimitStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await request('POST', '/api/auth/login', { username: 'wrong', password: '123' });
      rateLimitStatus = res.statusCode;
    }
    console.log('Rate limit status after 6 attempts (expect 429):', rateLimitStatus);

  } catch (err) {
    console.error(err);
  }
})();

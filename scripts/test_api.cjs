(async () => {
  try {
    const base = process.env.API_BASE || 'http://localhost:3003';
    // Login
    let resp = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@chaishorts.com', password: 'admin123' })
    });
    const login = await resp.json();
    console.log('Login:', login.user?.email, 'token?', !!login.token);

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${login.token}` };

    resp = await fetch(base + '/api/topics', { headers });
    const topics = await resp.json();
    console.log('Topics:', topics.map(t=>t.name));

    resp = await fetch(base + '/api/programs', { headers });
    const programs = await resp.json();
    console.log('Programs:', programs.length);
  } catch (err) {
    console.error('API test failed:', err);
    process.exitCode = 1;
  }
})();

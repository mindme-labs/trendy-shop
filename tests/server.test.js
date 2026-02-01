const { test } = require('node:test');
const assert = require('node:assert');

test('GET /feed returns 200', async () => {
  delete require.cache[require.resolve('../server.js')];
  const app = require('../server.js');
  
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', (err) => {
      if (err) reject(err);
      else resolve(s);
    });
  });
  
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/feed`);
    assert.strictEqual(response.status, 200);
    const text = await response.text();
    assert.ok(text.includes('TrendHunter'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /dashboard returns 200', async () => {
  delete require.cache[require.resolve('../server.js')];
  const app = require('../server.js');
  
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', (err) => {
      if (err) reject(err);
      else resolve(s);
    });
  });
  
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/dashboard`);
    assert.strictEqual(response.status, 200);
    const text = await response.text();
    assert.ok(text.includes('TrendHunter'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET / redirects to /feed', async () => {
  delete require.cache[require.resolve('../server.js')];
  const app = require('../server.js');
  
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', (err) => {
      if (err) reject(err);
      else resolve(s);
    });
  });
  
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' });
    assert.strictEqual(response.status, 302);
    assert.strictEqual(response.headers.get('location'), '/feed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

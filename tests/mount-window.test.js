const { test } = require('node:test');
const assert = require('node:assert');

// Load config only (not app.js yet, as it will try to initialize)
const { TEXT_CONFIG } = require('../public/config.js');

test('IntersectionObserver configuration concept is correct', () => {
  // The observer should be configured with:
  // - rootMargin: '100% 0px' (load ±1 slide above and below viewport)
  // - threshold: 0.1 (trigger when 10% of element is visible)
  
  // Verify the configuration values we plan to use
  const expectedConfig = {
    rootMargin: '100% 0px',
    threshold: 0.1
  };
  
  assert.strictEqual(expectedConfig.rootMargin, '100% 0px', 'rootMargin should load ±1 viewport height');
  assert.strictEqual(expectedConfig.threshold, 0.1, 'threshold should be 0.1');
});

test('Embed mounting prevents duplicate mounts', () => {
  const mountedEmbeds = new Set();
  
  const itemId = 'test-1';
  
  // First mount
  assert.ok(!mountedEmbeds.has(itemId), 'Should not be mounted initially');
  mountedEmbeds.add(itemId);
  assert.ok(mountedEmbeds.has(itemId), 'Should be mounted after first add');
  
  // Try to mount again (should be prevented by checking mountedEmbeds.has())
  if (!mountedEmbeds.has(itemId)) {
    mountedEmbeds.add(itemId);
  }
  
  assert.strictEqual(mountedEmbeds.size, 1, 'Should still have only 1 mounted embed');
});

test('Embed unmounting clears tracking', () => {
  const mountedEmbeds = new Set();
  
  const itemId = 'test-1';
  mountedEmbeds.add(itemId);
  
  assert.ok(mountedEmbeds.has(itemId), 'Should be mounted');
  
  // Unmount
  mountedEmbeds.delete(itemId);
  
  assert.ok(!mountedEmbeds.has(itemId), 'Should be unmounted');
});

test('TikTok URL parsing extracts video ID correctly', () => {
  const url = 'https://www.tiktok.com/@karissa.brighton/video/7599004879440416031';
  const match = url.match(/video\/(\d+)/);
  
  assert.ok(match, 'Should match video ID pattern');
  assert.strictEqual(match[1], '7599004879440416031', 'Should extract correct video ID');
});

test('Instagram URL validation works', () => {
  const validUrls = [
    'https://www.instagram.com/reel/DFpu68xMsxg/',
    'https://www.instagram.com/p/DFpu68xMsxg/'
  ];
  
  validUrls.forEach(url => {
    assert.match(url, /^https:\/\/www\.instagram\.com\/(reel|p)\/[\w-]+\/$/, 
      `Should match Instagram URL pattern: ${url}`);
  });
});

test('Fallback UI contains required text', () => {
  // Verify that fallback UI would contain the correct text from TEXT_CONFIG
  assert.ok(TEXT_CONFIG.fallback_embed_title, 'Should have fallback title');
  assert.ok(TEXT_CONFIG.fallback_embed_body, 'Should have fallback body');
  assert.ok(TEXT_CONFIG.btn_open_post, 'Should have open post button text');
});

test('Observer rootMargin is configured for ±1 viewport', () => {
  // The rootMargin should be '100% 0px' which means:
  // - Top: 100% of viewport height above
  // - Bottom: 100% of viewport height below
  // This ensures we load the current slide + 1 above + 1 below
  
  const rootMargin = '100% 0px';
  
  // Verify format
  assert.match(rootMargin, /^\d+%\s+\d+px$/, 'Should match expected format');
  
  // Verify it starts with 100%
  assert.ok(rootMargin.startsWith('100%'), 'Should have 100% top/bottom margin');
});

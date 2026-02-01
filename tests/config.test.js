const { test } = require('node:test');
const assert = require('node:assert');
const {
  TEXT_CONFIG,
  POST_CONFIG,
  NORMALIZED_POST_CONFIG,
  normalizeURL,
  validateURL
} = require('../public/config.js');

test('TEXT_CONFIG exists and has all required keys', () => {
  const requiredKeys = [
    'app_name', 'tab_feed', 'tab_dashboard',
    'btn_save', 'btn_saved', 'btn_open_post',
    'filter_category', 'filter_all', 'cat_home', 'cat_kids', 'cat_tech',
    'sort_label', 'sort_sat_asc', 'sort_sat_desc', 'sort_price_asc', 'sort_price_desc', 'sort_views_desc',
    'metric_views', 'metric_likes', 'metric_comments', 'metric_saturation', 'price_label',
    'fallback_embed_title', 'fallback_embed_body',
    'empty_saved_title', 'empty_saved_body',
    'alert_saved'
  ];
  
  assert.ok(TEXT_CONFIG, 'TEXT_CONFIG should exist');
  
  requiredKeys.forEach(key => {
    assert.ok(TEXT_CONFIG[key], `TEXT_CONFIG should have key: ${key}`);
    assert.strictEqual(typeof TEXT_CONFIG[key], 'string', `TEXT_CONFIG.${key} should be a string`);
  });
});

test('URL normalization strips query params and fragments', () => {
  const testCases = [
    {
      input: 'https://www.tiktok.com/@karissa.brighton/video/7599004879440416031?foo=bar#test',
      expected: 'https://www.tiktok.com/@karissa.brighton/video/7599004879440416031'
    },
    {
      input: 'https://www.instagram.com/reel/DFpu68xMsxg/?utm_source=test',
      expected: 'https://www.instagram.com/reel/DFpu68xMsxg/'
    },
    {
      input: 'https://www.instagram.com/reel/DFpu68xMsxg',
      expected: 'https://www.instagram.com/reel/DFpu68xMsxg/'
    }
  ];
  
  testCases.forEach(({ input, expected }) => {
    assert.strictEqual(normalizeURL(input), expected, `Should normalize ${input}`);
  });
});

test('TikTok URLs are valid and normalized', () => {
  assert.ok(Array.isArray(NORMALIZED_POST_CONFIG.tiktok), 'TikTok URLs should be an array');
  assert.ok(NORMALIZED_POST_CONFIG.tiktok.length > 0, 'Should have at least one TikTok URL');
  
  NORMALIZED_POST_CONFIG.tiktok.forEach(url => {
    assert.ok(validateURL(url, 'tiktok'), `TikTok URL should be valid: ${url}`);
    assert.match(url, /^https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+$/, `TikTok URL should match pattern: ${url}`);
  });
});

test('Instagram URLs are valid and normalized', () => {
  assert.ok(Array.isArray(NORMALIZED_POST_CONFIG.instagram), 'Instagram URLs should be an array');
  assert.ok(NORMALIZED_POST_CONFIG.instagram.length > 0, 'Should have at least one Instagram URL');
  
  NORMALIZED_POST_CONFIG.instagram.forEach(url => {
    assert.ok(validateURL(url, 'instagram'), `Instagram URL should be valid: ${url}`);
    assert.match(url, /^https:\/\/www\.instagram\.com\/(reel|p)\/[\w-]+\/$/, `Instagram URL should match pattern: ${url}`);
  });
});

test('POST_CONFIG has exact required TikTok URLs', () => {
  const expectedTikTokURLs = [
    'https://www.tiktok.com/@karissa.brighton/video/7599004879440416031',
    'https://www.tiktok.com/@karissa.brighton/video/7598275974974704926',
    'https://www.tiktok.com/@karissa.brighton/video/7597894830575848734',
    'https://www.tiktok.com/@karissa.brighton/video/7597511240868564254',
    'https://www.tiktok.com/@karissa.brighton/video/7597181792952569119',
    'https://www.tiktok.com/@karissa.brighton/video/7596780691359091999',
    'https://www.tiktok.com/@karissa.brighton/video/7595667396921134366',
    'https://www.tiktok.com/@karissa.brighton/video/7594949743646674206',
    'https://www.tiktok.com/@karissa.brighton/video/7594555155895438622',
    'https://www.tiktok.com/@karissa.brighton/video/7594212911170522399'
  ];
  
  assert.strictEqual(NORMALIZED_POST_CONFIG.tiktok.length, expectedTikTokURLs.length, 'Should have exactly 10 TikTok URLs');
  
  expectedTikTokURLs.forEach((expectedURL, index) => {
    assert.strictEqual(NORMALIZED_POST_CONFIG.tiktok[index], expectedURL, `TikTok URL at index ${index} should match`);
  });
});

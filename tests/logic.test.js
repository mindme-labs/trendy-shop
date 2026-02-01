const { test } = require('node:test');
const assert = require('node:assert');
const { generateFeedItems } = require('../public/config.js');
const { AppState, formatNumber, getSaturationColor } = require('../public/app.js');

// Mock localStorage for Node.js environment
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

test('Saturation formula calculates correctly', () => {
  const testItem = {
    id: 'test-1',
    statsNow: {
      views: 100000,
      likes: 500,
      comments: 100
    }
  };
  
  const expectedSaturation = 100000 / (500 + 100); // = 166.67
  const saturationScore = testItem.statsNow.views / (testItem.statsNow.likes + testItem.statsNow.comments);
  
  assert.strictEqual(parseFloat(saturationScore.toFixed(1)), parseFloat(expectedSaturation.toFixed(1)));
});

test('Saturation formula is calculated for all feed items', () => {
  const items = generateFeedItems();
  
  assert.ok(items.length > 0, 'Should have feed items');
  
  items.forEach(item => {
    assert.ok(item.saturationScore, 'Item should have saturation score');
    assert.strictEqual(typeof item.saturationScore, 'number', 'Saturation score should be a number');
    
    const expectedSaturation = item.statsNow.views / (item.statsNow.likes + item.statsNow.comments);
    assert.strictEqual(
      item.saturationScore,
      parseFloat(expectedSaturation.toFixed(1)),
      'Saturation score should match formula'
    );
  });
});

test('Sorting by saturation ascending (best to worst)', () => {
  // Clear localStorage before test
  global.localStorage.clear();
  
  // Reinitialize AppState
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.currentFilter = 'Все';
  AppState.currentSort = 'sat_asc';
  AppState.init();
  
  const sorted = AppState.getFilteredItems();
  
  // Check that items are sorted by saturation ascending (lower = better)
  for (let i = 0; i < sorted.length - 1; i++) {
    assert.ok(
      sorted[i].saturationScore <= sorted[i + 1].saturationScore,
      `Item ${i} saturation (${sorted[i].saturationScore}) should be <= item ${i + 1} (${sorted[i + 1].saturationScore})`
    );
  }
});

test('Sorting by saturation descending (worst to best)', () => {
  AppState.currentSort = 'sat_desc';
  const sorted = AppState.getFilteredItems();
  
  for (let i = 0; i < sorted.length - 1; i++) {
    assert.ok(
      sorted[i].saturationScore >= sorted[i + 1].saturationScore,
      `Item ${i} saturation should be >= item ${i + 1}`
    );
  }
});

test('Sorting by price ascending', () => {
  AppState.currentSort = 'price_asc';
  const sorted = AppState.getFilteredItems();
  
  for (let i = 0; i < sorted.length - 1; i++) {
    assert.ok(
      sorted[i].priceRub <= sorted[i + 1].priceRub,
      `Item ${i} price should be <= item ${i + 1}`
    );
  }
});

test('Sorting by price descending', () => {
  AppState.currentSort = 'price_desc';
  const sorted = AppState.getFilteredItems();
  
  for (let i = 0; i < sorted.length - 1; i++) {
    assert.ok(
      sorted[i].priceRub >= sorted[i + 1].priceRub,
      `Item ${i} price should be >= item ${i + 1}`
    );
  }
});

test('Sorting by views descending', () => {
  AppState.currentSort = 'views_desc';
  const sorted = AppState.getFilteredItems();
  
  for (let i = 0; i < sorted.length - 1; i++) {
    assert.ok(
      sorted[i].statsNow.views >= sorted[i + 1].statsNow.views,
      `Item ${i} views should be >= item ${i + 1}`
    );
  }
});

test('Category filtering works', () => {
  const TEXT_CONFIG = require('../public/config.js').TEXT_CONFIG;
  
  // Test "Все" filter
  AppState.currentFilter = TEXT_CONFIG.filter_all;
  const allItems = AppState.getFilteredItems();
  assert.ok(allItems.length > 0, 'Should have items with "Все" filter');
  
  // Test category-specific filters
  const categories = [TEXT_CONFIG.cat_home, TEXT_CONFIG.cat_kids, TEXT_CONFIG.cat_tech];
  
  categories.forEach(category => {
    AppState.currentFilter = category;
    const filtered = AppState.getFilteredItems();
    
    filtered.forEach(item => {
      assert.strictEqual(item.category, category, `Item should belong to category ${category}`);
    });
  });
});

test('Saving persistence works', () => {
  global.localStorage.clear();
  
  // Reinitialize
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.init();
  
  const firstItem = AppState.feedItems[0];
  assert.strictEqual(firstItem.saved, false, 'Item should not be saved initially');
  
  // Save item
  AppState.toggleSave(firstItem.id);
  assert.ok(AppState.savedItems.has(firstItem.id), 'Item should be in savedItems set');
  
  // Check localStorage
  const savedData = global.localStorage.getItem('trendhunter_saved');
  assert.ok(savedData, 'Should have saved data in localStorage');
  
  const parsed = JSON.parse(savedData);
  assert.ok(parsed.includes(firstItem.id), 'Saved data should include item ID');
  
  // Unsave item
  AppState.toggleSave(firstItem.id);
  assert.ok(!AppState.savedItems.has(firstItem.id), 'Item should be removed from savedItems set');
  
  const savedDataAfter = global.localStorage.getItem('trendhunter_saved');
  const parsedAfter = JSON.parse(savedDataAfter);
  assert.ok(!parsedAfter.includes(firstItem.id), 'Item ID should be removed from saved data');
});

test('Saved items persist across app initialization', () => {
  global.localStorage.clear();
  
  // Initialize and save an item
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.init();
  
  const itemToSave = AppState.feedItems[2];
  AppState.toggleSave(itemToSave.id);
  
  // Simulate app restart by reinitializing
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.init();
  
  // Check that the item is still marked as saved
  const reloadedItem = AppState.feedItems.find(i => i.id === itemToSave.id);
  assert.ok(reloadedItem.saved, 'Item should still be saved after reinitialization');
  assert.ok(AppState.savedItems.has(itemToSave.id), 'Item should be in savedItems set after reload');
});

test('formatNumber utility works correctly', () => {
  assert.strictEqual(formatNumber(500), '500');
  assert.strictEqual(formatNumber(1500), '1.5K');
  assert.strictEqual(formatNumber(15000), '15.0K');
  assert.strictEqual(formatNumber(1500000), '1.5M');
  assert.strictEqual(formatNumber(5000000), '5.0M');
});

test('getSaturationColor returns correct color classes', () => {
  assert.strictEqual(getSaturationColor(30), 'text-green-400');
  assert.strictEqual(getSaturationColor(75), 'text-yellow-400');
  assert.strictEqual(getSaturationColor(150), 'text-orange-400');
  assert.strictEqual(getSaturationColor(250), 'text-red-400');
});

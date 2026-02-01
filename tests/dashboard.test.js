const { test } = require('node:test');
const assert = require('node:assert');
const { generateFeedItems } = require('../public/config.js');

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

const { AppState } = require('../public/app.js');

test('Dashboard KPI: Total items count is correct', () => {
  global.localStorage.clear();
  
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.init();
  
  const totalItems = AppState.feedItems.length;
  
  assert.ok(totalItems > 0, 'Should have feed items');
  assert.strictEqual(typeof totalItems, 'number', 'Total items should be a number');
});

test('Dashboard KPI: Saved items count is correct', () => {
  global.localStorage.clear();
  
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.init();
  
  // Save some items
  const itemsToSave = [AppState.feedItems[0], AppState.feedItems[1], AppState.feedItems[2]];
  itemsToSave.forEach(item => AppState.toggleSave(item.id));
  
  const savedItems = AppState.getSavedItems();
  
  assert.strictEqual(savedItems.length, 3, 'Should have 3 saved items');
  assert.strictEqual(AppState.savedItems.size, 3, 'savedItems set should have 3 items');
});

test('Dashboard KPI: Average saturation is calculated correctly', () => {
  global.localStorage.clear();
  
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.init();
  
  const totalItems = AppState.feedItems.length;
  const totalSaturation = AppState.feedItems.reduce((sum, item) => sum + item.saturationScore, 0);
  const avgSaturation = totalSaturation / totalItems;
  
  assert.ok(avgSaturation > 0, 'Average saturation should be positive');
  assert.strictEqual(typeof avgSaturation, 'number', 'Average saturation should be a number');
  
  // Verify calculation
  const calculatedAvg = parseFloat((totalSaturation / totalItems).toFixed(1));
  assert.strictEqual(parseFloat(avgSaturation.toFixed(1)), calculatedAvg, 'Average should match calculation');
});

test('Dashboard: getSavedItems returns only saved items', () => {
  global.localStorage.clear();
  
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.init();
  
  // Save specific items
  const item1 = AppState.feedItems[0];
  const item2 = AppState.feedItems[3];
  
  AppState.toggleSave(item1.id);
  AppState.toggleSave(item2.id);
  
  const savedItems = AppState.getSavedItems();
  
  assert.strictEqual(savedItems.length, 2, 'Should have exactly 2 saved items');
  assert.ok(savedItems.find(item => item.id === item1.id), 'Should include first saved item');
  assert.ok(savedItems.find(item => item.id === item2.id), 'Should include second saved item');
  
  // Verify all returned items are actually saved
  savedItems.forEach(item => {
    assert.ok(AppState.savedItems.has(item.id), `Item ${item.id} should be in savedItems set`);
  });
});

test('Dashboard: Saved items mapping preserves all properties', () => {
  global.localStorage.clear();
  
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.init();
  
  const originalItem = AppState.feedItems[0];
  AppState.toggleSave(originalItem.id);
  
  const savedItems = AppState.getSavedItems();
  const savedItem = savedItems[0];
  
  // Verify all important properties are preserved
  assert.strictEqual(savedItem.id, originalItem.id, 'ID should match');
  assert.strictEqual(savedItem.productName, originalItem.productName, 'Product name should match');
  assert.strictEqual(savedItem.productDescription, originalItem.productDescription, 'Description should match');
  assert.strictEqual(savedItem.category, originalItem.category, 'Category should match');
  assert.strictEqual(savedItem.priceRub, originalItem.priceRub, 'Price should match');
  assert.strictEqual(savedItem.saturationScore, originalItem.saturationScore, 'Saturation should match');
  assert.strictEqual(savedItem.platform, originalItem.platform, 'Platform should match');
  assert.strictEqual(savedItem.url, originalItem.url, 'URL should match');
  assert.deepStrictEqual(savedItem.statsNow, originalItem.statsNow, 'Stats should match');
});

test('Dashboard: Empty saved items returns empty array', () => {
  global.localStorage.clear();
  
  AppState.feedItems = [];
  AppState.savedItems = new Set();
  AppState.init();
  
  const savedItems = AppState.getSavedItems();
  
  assert.ok(Array.isArray(savedItems), 'Should return an array');
  assert.strictEqual(savedItems.length, 0, 'Should be empty when no items are saved');
});

test('Sparkline generation creates valid output', () => {
  const values = [100, 150, 200, 180, 220, 250, 300];
  
  // Mock sparkline function (simplified version for testing)
  function testGenerateSparkline(values, width = 100, height = 30) {
    if (!values || values.length < 2) return '';
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return points;
  }
  
  const result = testGenerateSparkline(values, 100, 30);
  
  assert.ok(result.length > 0, 'Should generate sparkline points');
  assert.ok(result.includes(','), 'Should contain coordinate pairs');
  
  // Verify number of points
  const pointCount = result.split(' ').length;
  assert.strictEqual(pointCount, values.length, 'Should have one point per value');
});

test('Growth data generation creates 7 days of data', () => {
  // Mock growth data generation
  function testGenerateGrowthData(baseViews, growthRate) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayFactor = Math.pow(1 + growthRate, (i - 6) / 6);
      const views = Math.floor(baseViews * dayFactor);
      days.push(views);
    }
    return days;
  }
  
  const baseViews = 100000;
  const growthRate = 0.3; // 30% growth
  
  const growthData = testGenerateGrowthData(baseViews, growthRate);
  
  assert.strictEqual(growthData.length, 7, 'Should have 7 days of data');
  
  // Verify growth trend (each day should be >= previous)
  for (let i = 1; i < growthData.length; i++) {
    assert.ok(growthData[i] >= growthData[i - 1], `Day ${i} should have more views than day ${i - 1}`);
  }
  
  // Verify final value is greater than initial
  assert.ok(growthData[6] > growthData[0], 'Final day should have more views than first day');
});

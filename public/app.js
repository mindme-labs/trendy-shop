// Load config in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  const { TEXT_CONFIG, generateFeedItems } = require('./config.js');
  global.TEXT_CONFIG = TEXT_CONFIG;
  global.generateFeedItems = generateFeedItems;
}

// App State
const AppState = {
  feedItems: [],
  savedItems: new Set(),
  currentFilter: TEXT_CONFIG.filter_all,
  currentSort: 'sat_asc',
  
  init() {
    // Load saved items from localStorage
    const saved = localStorage.getItem('trendhunter_saved');
    if (saved) {
      try {
        const savedArray = JSON.parse(saved);
        this.savedItems = new Set(savedArray);
      } catch (e) {
        console.error('Error loading saved items:', e);
      }
    }
    
    // Generate feed items
    this.feedItems = generateFeedItems();
    
    // Apply saved state to items
    this.feedItems.forEach(item => {
      item.saved = this.savedItems.has(item.id);
    });
  },
  
  savePersist() {
    localStorage.setItem('trendhunter_saved', JSON.stringify([...this.savedItems]));
  },
  
  toggleSave(itemId) {
    const item = this.feedItems.find(i => i.id === itemId);
    if (!item) return;
    
    if (this.savedItems.has(itemId)) {
      this.savedItems.delete(itemId);
      item.saved = false;
    } else {
      this.savedItems.add(itemId);
      item.saved = true;
    }
    
    this.savePersist();
  },
  
  getFilteredItems() {
    let filtered = [...this.feedItems];
    
    // Apply category filter
    if (this.currentFilter !== TEXT_CONFIG.filter_all) {
      filtered = filtered.filter(item => item.category === this.currentFilter);
    }
    
    // Apply sorting
    switch (this.currentSort) {
      case 'sat_asc':
        filtered.sort((a, b) => a.saturationScore - b.saturationScore);
        break;
      case 'sat_desc':
        filtered.sort((a, b) => b.saturationScore - a.saturationScore);
        break;
      case 'price_asc':
        filtered.sort((a, b) => a.priceRub - b.priceRub);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.priceRub - a.priceRub);
        break;
      case 'views_desc':
        filtered.sort((a, b) => b.statsNow.views - a.statsNow.views);
        break;
    }
    
    return filtered;
  },
  
  getSavedItems() {
    return this.feedItems.filter(item => this.savedItems.has(item.id));
  }
};

// Utility functions
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function getSaturationColor(score) {
  // Lower saturation = better (more engagement per view)
  // Color coding: green (good) -> yellow -> red (bad)
  if (score < 50) return 'text-green-400';
  if (score < 100) return 'text-yellow-400';
  if (score < 200) return 'text-orange-400';
  return 'text-red-400';
}

// Embed Mounting System
const EmbedManager = {
  mountedEmbeds: new Set(),
  observer: null,
  
  mountTikTokEmbed(container, url, itemId) {
    if (this.mountedEmbeds.has(itemId)) return;
    
    // Extract username and video ID from URL
    const match = url.match(/@([\w.-]+)\/video\/(\d+)/);
    if (!match) {
      console.warn('Invalid TikTok URL format:', url);
      this.showFallback(container, url, itemId);
      return;
    }
    
    const username = match[1];
    const videoId = match[2];
    
    // Use iframe embed - more reliable than blockquote method
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.tiktok.com/embed/v2/${videoId}`;
    iframe.style.width = '100%';
    iframe.style.maxWidth = '605px';
    iframe.style.minHeight = '600px';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.margin = '0 auto';
    iframe.style.display = 'block';
    iframe.allow = 'encrypted-media;';
    iframe.allowFullscreen = true;
    iframe.scrolling = 'no';
    
    // Set up iframe wrapper
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.minHeight = '600px';
    
    wrapper.appendChild(iframe);
    container.innerHTML = '';
    container.appendChild(wrapper);
    
    this.mountedEmbeds.add(itemId);
    
    // Add error handler
    iframe.onerror = () => {
      console.warn('TikTok iframe failed to load:', url);
      this.showFallback(container, url, itemId);
    };
    
    // Check if iframe loaded after a timeout
    setTimeout(() => {
      // If iframe is empty or failed, show fallback
      try {
        if (!iframe.contentWindow) {
          console.warn('TikTok iframe blocked:', url);
          this.showFallback(container, url, itemId);
        }
      } catch (e) {
        // Cross-origin access - this is actually good, means iframe is loading
        console.log('TikTok iframe loading (cross-origin):', url);
      }
    }, 3000);
  },
  
  mountInstagramEmbed(container, url, itemId) {
    if (this.mountedEmbeds.has(itemId)) return;
    
    // Create Instagram embed blockquote
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'instagram-media';
    blockquote.setAttribute('data-instgrm-permalink', url);
    blockquote.setAttribute('data-instgrm-version', '14');
    blockquote.style.maxWidth = '540px';
    blockquote.style.minWidth = '326px';
    blockquote.style.width = 'calc(100% - 2px)';
    
    container.innerHTML = '';
    container.appendChild(blockquote);
    
    // Initialize Instagram embed
    if (typeof window.instgrm !== 'undefined') {
      window.instgrm.Embeds.process();
    } else {
      // Wait for Instagram script to load
      setTimeout(() => {
        if (typeof window.instgrm !== 'undefined') {
          window.instgrm.Embeds.process();
        } else {
          this.showFallback(container, url, itemId);
        }
      }, 1000);
    }
    
    this.mountedEmbeds.add(itemId);
  },
  
  showFallback(container, url, itemId) {
    container.innerHTML = `
      <div class="text-center p-8">
        <div class="text-6xl mb-4">⚠️</div>
        <h3 class="text-xl font-bold mb-2">${TEXT_CONFIG.fallback_embed_title}</h3>
        <p class="text-gray-400 text-sm mb-4">${TEXT_CONFIG.fallback_embed_body}</p>
        <a href="${url}" target="_blank" rel="noopener noreferrer" 
           class="inline-block px-6 py-2 bg-blue-600 rounded-full font-medium">
          ${TEXT_CONFIG.btn_open_post}
        </a>
      </div>
    `;
  },
  
  unmountEmbed(itemId) {
    this.mountedEmbeds.delete(itemId);
    const container = document.getElementById(`embed-${itemId}`);
    if (container) {
      const loadingPlaceholder = `
        <div class="text-center p-8">
          <div class="text-6xl mb-4">💤</div>
          <p class="text-gray-400 text-sm">Загрузка...</p>
        </div>
      `;
      container.innerHTML = loadingPlaceholder;
    }
  }
};

// Setup IntersectionObserver for lazy embed loading
function setupEmbedObserver() {
  if (typeof IntersectionObserver === 'undefined') return;
  
  // Clear previous observer
  if (EmbedManager.observer) {
    EmbedManager.observer.disconnect();
  }
  
  const options = {
    root: null,
    rootMargin: '100% 0px', // Load ±1 slide (viewport height above and below)
    threshold: 0.1
  };
  
  EmbedManager.observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const slide = entry.target;
      const itemId = slide.dataset.itemId;
      const url = slide.dataset.url;
      const platform = slide.dataset.platform;
      
      if (entry.isIntersecting) {
        // Slide is entering viewport - mount embed
        const container = document.getElementById(`embed-${itemId}`);
        if (container && !EmbedManager.mountedEmbeds.has(itemId)) {
          if (platform === 'tiktok') {
            EmbedManager.mountTikTokEmbed(container, url, itemId);
          } else if (platform === 'instagram') {
            EmbedManager.mountInstagramEmbed(container, url, itemId);
          }
        }
      } else {
        // Slide is leaving viewport - unmount embed to save memory
        // Only unmount if it's far from viewport (not just at edge)
        const rect = slide.getBoundingClientRect();
        const isFarAway = rect.bottom < -window.innerHeight || rect.top > window.innerHeight * 2;
        
        if (isFarAway && EmbedManager.mountedEmbeds.has(itemId)) {
          EmbedManager.unmountEmbed(itemId);
        }
      }
    });
  }, options);
  
  // Observe all feed slides
  const slides = document.querySelectorAll('.feed-slide');
  slides.forEach(slide => {
    EmbedManager.observer.observe(slide);
  });
}

// Feed Page Renderer
function renderFeedPage() {
  const app = document.getElementById('app');
  
  const filteredItems = AppState.getFilteredItems();
  
  app.innerHTML = `
    <!-- Header with filters -->
    <div class="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700">
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h1 class="text-xl font-bold">${TEXT_CONFIG.app_name}</h1>
          <div class="flex gap-2">
            <a href="/feed" class="px-5 py-2 bg-blue-600 rounded text-base font-medium">${TEXT_CONFIG.tab_feed}</a>
            <a href="/dashboard" class="px-5 py-2 bg-gray-700 rounded text-base font-medium">${TEXT_CONFIG.tab_dashboard}</a>
          </div>
        </div>
        
        <!-- Filters -->
        <div class="flex gap-2 mb-2 overflow-x-auto pb-2">
          <select id="categoryFilter" class="bg-gray-800 text-white rounded px-3 py-1 text-sm">
            <option value="${TEXT_CONFIG.filter_all}">${TEXT_CONFIG.filter_all}</option>
            <option value="${TEXT_CONFIG.cat_home}">${TEXT_CONFIG.cat_home}</option>
            <option value="${TEXT_CONFIG.cat_kids}">${TEXT_CONFIG.cat_kids}</option>
            <option value="${TEXT_CONFIG.cat_tech}">${TEXT_CONFIG.cat_tech}</option>
          </select>
          
          <select id="sortSelect" class="bg-gray-800 text-white rounded px-3 py-1 text-sm flex-1">
            <option value="sat_asc">${TEXT_CONFIG.sort_sat_asc}</option>
            <option value="sat_desc">${TEXT_CONFIG.sort_sat_desc}</option>
            <option value="price_asc">${TEXT_CONFIG.sort_price_asc}</option>
            <option value="price_desc">${TEXT_CONFIG.sort_price_desc}</option>
            <option value="views_desc">${TEXT_CONFIG.sort_views_desc}</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- Feed Container -->
    <div class="feed-container pt-32" id="feedContainer">
      ${filteredItems.map((item, index) => renderFeedSlide(item, index)).join('')}
    </div>
  `;
  
  // Set current filter and sort values
  document.getElementById('categoryFilter').value = AppState.currentFilter;
  document.getElementById('sortSelect').value = AppState.currentSort;
  
  // Attach event listeners
  document.getElementById('categoryFilter').addEventListener('change', (e) => {
    AppState.currentFilter = e.target.value;
    renderFeedPage();
  });
  
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    AppState.currentSort = e.target.value;
    renderFeedPage();
  });
  
  // Attach save button listeners
  filteredItems.forEach(item => {
    const btn = document.getElementById(`save-btn-${item.id}`);
    if (btn) {
      btn.addEventListener('click', () => {
        AppState.toggleSave(item.id);
        // Update button
        btn.textContent = item.saved ? TEXT_CONFIG.btn_saved : TEXT_CONFIG.btn_save;
        btn.className = item.saved 
          ? 'px-6 py-2 bg-green-600 rounded-full font-medium'
          : 'px-6 py-2 bg-blue-600 rounded-full font-medium';
      });
    }
  });
  
  // Setup embed mounting with IntersectionObserver
  setupEmbedObserver();
}

function renderFeedSlide(item, index) {
  const satColor = getSaturationColor(item.saturationScore);
  
  return `
    <div class="feed-slide bg-gray-900" data-item-id="${item.id}" data-index="${index}" data-url="${item.url}" data-platform="${item.platform}">
      <!-- Embed placeholder -->
      <div class="flex-1 flex items-center justify-center bg-gray-800 overflow-hidden" id="embed-${item.id}" style="min-height: 60vh;">
        <div class="text-center p-8" id="loading-${item.id}">
          <div class="text-6xl mb-4">${item.platform === 'tiktok' ? '🎵' : '📸'}</div>
          <p class="text-gray-400 text-sm">${item.platform.toUpperCase()}</p>
          <p class="text-gray-500 text-xs mt-2">Загрузка...</p>
        </div>
      </div>
      
      <!-- Product Info Overlay - Compact for mobile -->
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3 pb-4">
        <!-- Category Badge -->
        <div class="mb-2">
          <span class="inline-block px-2 py-0.5 bg-blue-600/80 rounded-full text-xs font-medium">
            ${item.category}
          </span>
        </div>
        
        <!-- Product Name -->
        <h2 class="text-lg font-bold mb-1">${item.productName}</h2>
        
        <!-- Description -->
        <p class="text-gray-300 text-xs mb-2 line-clamp-2">${item.productDescription}</p>
        
        <!-- Metrics Grid - Compact -->
        <div class="grid grid-cols-4 gap-2 mb-2">
          <div class="bg-gray-800/80 rounded p-2">
            <div class="text-[10px] text-gray-400 mb-0.5">${TEXT_CONFIG.metric_views}</div>
            <div class="text-xs font-bold">${formatNumber(item.statsNow.views)}</div>
          </div>
          <div class="bg-gray-800/80 rounded p-2">
            <div class="text-[10px] text-gray-400 mb-0.5">${TEXT_CONFIG.metric_likes}</div>
            <div class="text-xs font-bold">${formatNumber(item.statsNow.likes)}</div>
          </div>
          <div class="bg-gray-800/80 rounded p-2">
            <div class="text-[10px] text-gray-400 mb-0.5">${TEXT_CONFIG.metric_comments}</div>
            <div class="text-xs font-bold">${formatNumber(item.statsNow.comments)}</div>
          </div>
          <div class="bg-gray-800/80 rounded p-2">
            <div class="text-[10px] text-gray-400 mb-0.5">${TEXT_CONFIG.metric_saturation}</div>
            <div class="text-xs font-bold ${satColor}">${item.saturationScore}</div>
          </div>
        </div>
        
        <!-- Price and Button Row -->
        <div class="flex items-center justify-between gap-2">
          <div>
            <span class="text-lg font-bold text-green-400">${item.priceRub} ₽</span>
            <span class="text-xs text-gray-400 ml-1">${TEXT_CONFIG.price_label}</span>
          </div>
          
          <!-- Action Button - Compact -->
          <button 
            id="save-btn-${item.id}"
            class="${item.saved ? 'px-4 py-1.5 bg-green-600 rounded-full font-medium text-sm' : 'px-4 py-1.5 bg-blue-600 rounded-full font-medium text-sm'}"
          >
            ${item.saved ? TEXT_CONFIG.btn_saved : TEXT_CONFIG.btn_save}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Generate sparkline SVG
function generateSparkline(values, width = 100, height = 30) {
  if (!values || values.length < 2) return '';
  
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return `
    <svg width="${width}" height="${height}" class="inline-block">
      <polyline
        points="${points}"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

// Generate mock 7-day growth data for items
function generateGrowthData(item) {
  const baseViews = item.statsNow.views;
  const growthRate = Math.random() * 0.5 + 0.1; // 10-60% growth
  
  // Generate 7 days of data showing growth
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dayFactor = Math.pow(1 + growthRate, (i - 6) / 6);
    const views = Math.floor(baseViews * dayFactor);
    days.push(views);
  }
  
  return days;
}

// Dashboard Page Renderer
function renderDashboardPage() {
  const app = document.getElementById('app');
  
  const savedItems = AppState.getSavedItems();
  const totalItems = AppState.feedItems.length;
  const avgSaturation = totalItems > 0
    ? (AppState.feedItems.reduce((sum, item) => sum + item.saturationScore, 0) / totalItems).toFixed(1)
    : 0;
  
  // Get top 5 items with best saturation (lowest score = better)
  const trendingItems = [...AppState.feedItems]
    .sort((a, b) => a.saturationScore - b.saturationScore)
    .slice(0, 5)
    .map(item => ({
      ...item,
      growthData: generateGrowthData(item)
    }));
  
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b">
        <div class="p-4">
          <div class="flex items-center justify-between mb-3">
            <h1 class="text-xl font-bold text-gray-900">${TEXT_CONFIG.app_name}</h1>
            <div class="flex gap-2">
              <a href="/feed" class="px-5 py-2 bg-gray-200 text-gray-900 rounded text-base font-medium">${TEXT_CONFIG.tab_feed}</a>
              <a href="/dashboard" class="px-5 py-2 bg-blue-600 text-white rounded text-base font-medium">${TEXT_CONFIG.tab_dashboard}</a>
            </div>
          </div>
        </div>
      </div>
      
      <!-- KPIs -->
      <div class="p-4">
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-white rounded-lg p-4 shadow">
            <div class="text-sm text-gray-500 mb-1">Всего товаров</div>
            <div class="text-2xl font-bold text-gray-900">${totalItems}</div>
          </div>
          <div class="bg-white rounded-lg p-4 shadow">
            <div class="text-sm text-gray-500 mb-1">Сохранено</div>
            <div class="text-2xl font-bold text-blue-600">${savedItems.length}</div>
          </div>
          <div class="bg-white rounded-lg p-4 shadow">
            <div class="text-sm text-gray-500 mb-1">Ср. насыщ.</div>
            <div class="text-2xl font-bold text-gray-900">${avgSaturation}</div>
          </div>
        </div>
        
        <!-- Trending Items with Growth -->
        <div class="bg-white rounded-lg shadow mb-6">
          <div class="p-4 border-b">
            <h2 class="text-lg font-bold text-gray-900">Товары с ростом за 7 дней</h2>
            <p class="text-sm text-gray-500 mt-1">Топ-5 товаров с лучшей насыщенностью и растущими просмотрами</p>
          </div>
          
          <div class="divide-y">
            ${trendingItems.map(item => {
              const growthPercent = ((item.growthData[6] - item.growthData[0]) / item.growthData[0] * 100).toFixed(1);
              return `
                <div class="p-4">
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex-1">
                      <h3 class="font-bold text-gray-900 mb-1">${item.productName}</h3>
                      <div class="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <span class="text-${item.platform === 'tiktok' ? 'pink' : 'purple'}-600">${item.platform.toUpperCase()}</span>
                        <span>${item.category}</span>
                        <span class="${getSaturationColor(item.saturationScore)}">${item.saturationScore}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="text-green-600">${generateSparkline(item.growthData, 80, 24)}</div>
                        <span class="text-sm font-medium text-green-600">+${growthPercent}%</span>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-xs text-gray-500 mb-1">Просмотры</div>
                      <div class="text-lg font-bold text-gray-900">${formatNumber(item.statsNow.views)}</div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <a href="${item.url}" target="_blank" rel="noopener noreferrer" 
                       class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-center text-sm font-medium hover:bg-blue-700">
                      ${TEXT_CONFIG.btn_open_post}
                    </a>
                    <button onclick="viewPostInModal('${item.id}')" 
                            class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-300">
                      Просмотреть пост
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <!-- Saved Items Section -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-4 border-b">
            <h2 class="text-lg font-bold text-gray-900">В работе</h2>
          </div>
          
          <div class="divide-y">
            ${savedItems.length === 0 ? `
              <div class="p-8 text-center">
                <div class="text-4xl mb-2">📦</div>
                <h3 class="font-bold text-gray-900 mb-1">${TEXT_CONFIG.empty_saved_title}</h3>
                <p class="text-sm text-gray-500">${TEXT_CONFIG.empty_saved_body}</p>
              </div>
            ` : savedItems.map(item => `
              <div class="p-4">
                <div class="flex items-start gap-3 mb-3">
                  <div class="text-3xl">${item.platform === 'tiktok' ? '🎵' : '📸'}</div>
                  <div class="flex-1">
                    <h3 class="font-bold text-gray-900 mb-1">${item.productName}</h3>
                    <p class="text-sm text-gray-600 mb-2">${item.productDescription}</p>
                    <div class="flex items-center gap-4 text-xs text-gray-500">
                      <span>${formatNumber(item.statsNow.views)} ${TEXT_CONFIG.metric_views.toLowerCase()}</span>
                      <span class="${getSaturationColor(item.saturationScore)}">${item.saturationScore}</span>
                      <span class="font-bold text-green-600">${item.priceRub} ₽</span>
                    </div>
                  </div>
                </div>
                <div class="flex gap-2">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" 
                     class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-center text-sm font-medium hover:bg-blue-700">
                    ${TEXT_CONFIG.btn_open_post}
                  </a>
                  <button onclick="viewPostInModal('${item.id}')" 
                          class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-300">
                    Просмотреть пост
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Modal for viewing posts
function viewPostInModal(itemId) {
  const item = AppState.feedItems.find(i => i.id === itemId);
  if (!item) return;
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'post-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4';
  modal.onclick = (e) => {
    if (e.target === modal) closePostModal();
  };
  
  modal.innerHTML = `
    <div class="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
        <h2 class="text-lg font-bold text-white">${item.productName}</h2>
        <button onclick="closePostModal()" class="text-white text-2xl hover:text-gray-300">&times;</button>
      </div>
      
      <div class="p-4">
        <!-- Embed Container -->
        <div class="bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden" style="min-height: 600px;" id="modal-embed-${item.id}">
          <div class="text-center p-8">
            <div class="text-6xl mb-4">${item.platform === 'tiktok' ? '🎵' : '📸'}</div>
            <p class="text-gray-400 text-sm">Загрузка...</p>
          </div>
        </div>
        
        <!-- Product Info -->
        <div class="bg-gray-800 rounded-lg p-4 mb-4">
          <div class="mb-3">
            <span class="inline-block px-3 py-1 bg-blue-600/80 rounded-full text-xs font-medium text-white">
              ${item.category}
            </span>
          </div>
          <p class="text-gray-300 text-sm mb-4">${item.productDescription}</p>
          
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-gray-700/50 rounded-lg p-3">
              <div class="text-xs text-gray-400 mb-1">${TEXT_CONFIG.metric_views}</div>
              <div class="text-lg font-bold text-white">${formatNumber(item.statsNow.views)}</div>
            </div>
            <div class="bg-gray-700/50 rounded-lg p-3">
              <div class="text-xs text-gray-400 mb-1">${TEXT_CONFIG.metric_likes}</div>
              <div class="text-lg font-bold text-white">${formatNumber(item.statsNow.likes)}</div>
            </div>
            <div class="bg-gray-700/50 rounded-lg p-3">
              <div class="text-xs text-gray-400 mb-1">${TEXT_CONFIG.metric_comments}</div>
              <div class="text-lg font-bold text-white">${formatNumber(item.statsNow.comments)}</div>
            </div>
            <div class="bg-gray-700/50 rounded-lg p-3">
              <div class="text-xs text-gray-400 mb-1">${TEXT_CONFIG.metric_saturation}</div>
              <div class="text-lg font-bold ${getSaturationColor(item.saturationScore)}">${item.saturationScore}</div>
            </div>
          </div>
          
          <div class="mb-4">
            <span class="text-2xl font-bold text-green-400">${item.priceRub} ₽</span>
          </div>
          
          <a href="${item.url}" target="_blank" rel="noopener noreferrer"
             class="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg text-center font-medium hover:bg-blue-700">
            ${TEXT_CONFIG.btn_open_post}
          </a>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  
  // Mount embed
  const container = document.getElementById(`modal-embed-${item.id}`);
  if (container) {
    if (item.platform === 'tiktok') {
      EmbedManager.mountTikTokEmbed(container, item.url, `modal-${item.id}`);
    } else if (item.platform === 'instagram') {
      EmbedManager.mountInstagramEmbed(container, item.url, `modal-${item.id}`);
    }
  }
}

function closePostModal() {
  const modal = document.getElementById('post-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// Make functions globally accessible
if (typeof window !== 'undefined') {
  window.viewPostInModal = viewPostInModal;
  window.closePostModal = closePostModal;
}

// Page initialization
function initApp() {
  AppState.init();
  
  const path = window.location.pathname;
  
  if (path === '/feed' || path === '/') {
    renderFeedPage();
  } else if (path === '/dashboard') {
    renderDashboardPage();
  }
}

// Start app when DOM is ready (browser only)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AppState,
    formatNumber,
    getSaturationColor
  };
}

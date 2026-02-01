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
    <!-- Enhanced Header with glassmorphism -->
    <div class="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/10 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div class="py-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                🔥
              </div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ${TEXT_CONFIG.app_name}
              </h1>
            </div>
            <div class="flex gap-2">
              <a href="/feed" class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-base font-medium hover-lift shadow-lg shadow-blue-500/30">
                ${TEXT_CONFIG.tab_feed}
              </a>
              <a href="/dashboard" class="px-6 py-2.5 bg-white/10 rounded-xl text-base font-medium hover-lift hover:bg-white/20 transition-all-smooth">
                ${TEXT_CONFIG.tab_dashboard}
              </a>
            </div>
          </div>
          
          <!-- Enhanced Filters -->
          <div class="flex gap-3 overflow-x-auto pb-2">
            <select id="categoryFilter" class="glass text-white rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer hover-lift transition-all-smooth">
              <option value="${TEXT_CONFIG.filter_all}">🎯 ${TEXT_CONFIG.filter_all}</option>
              <option value="${TEXT_CONFIG.cat_home}">🏠 ${TEXT_CONFIG.cat_home}</option>
              <option value="${TEXT_CONFIG.cat_kids}">👶 ${TEXT_CONFIG.cat_kids}</option>
              <option value="${TEXT_CONFIG.cat_tech}">💻 ${TEXT_CONFIG.cat_tech}</option>
            </select>
            
            <select id="sortSelect" class="glass text-white rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer hover-lift flex-1 transition-all-smooth">
              <option value="sat_asc">⬆️ ${TEXT_CONFIG.sort_sat_asc}</option>
              <option value="sat_desc">⬇️ ${TEXT_CONFIG.sort_sat_desc}</option>
              <option value="price_asc">💰 ${TEXT_CONFIG.sort_price_asc}</option>
              <option value="price_desc">💎 ${TEXT_CONFIG.sort_price_desc}</option>
              <option value="views_desc">👁️ ${TEXT_CONFIG.sort_views_desc}</option>
            </select>
            
            <div class="glass rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap">
              📊 ${filteredItems.length} товаров
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Feed Container -->
    <div class="feed-container pt-40" id="feedContainer">
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
  const platformIcon = item.platform === 'tiktok' ? '🎵' : '📸';
  const platformColor = item.platform === 'tiktok' ? 'from-pink-500 to-red-500' : 'from-purple-500 to-pink-500';
  
  return `
    <div class="feed-slide bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900" data-item-id="${item.id}" data-index="${index}" data-url="${item.url}" data-platform="${item.platform}">
      <div class="max-w-7xl mx-auto w-full h-full flex flex-col md:grid md:grid-cols-[1fr_450px] md:gap-6 px-4 md:px-6 lg:px-8 py-4">
        
        <!-- Embed Area -->
        <div class="flex-1 flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden backdrop-blur-sm border border-white/10 shadow-2xl" id="embed-${item.id}" style="min-height: 60vh;">
          <div class="text-center p-8 fade-in" id="loading-${item.id}">
            <div class="w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${platformColor} rounded-2xl flex items-center justify-center text-4xl shadow-lg">
              ${platformIcon}
            </div>
            <p class="text-white/80 text-lg font-medium mb-2">${item.platform.toUpperCase()}</p>
            <p class="text-white/50 text-sm">Загрузка контента...</p>
            <div class="mt-4 flex justify-center gap-2">
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
          </div>
        </div>
        
        <!-- Product Info Sidebar (Desktop) / Bottom Overlay (Mobile) -->
        <div class="md:relative absolute bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto gradient-overlay md:gradient-none md:bg-transparent p-6 md:p-0 md:flex md:flex-col md:justify-center fade-in">
          <div class="glass-dark md:glass rounded-2xl p-6 md:p-8 shadow-2xl">
            <!-- Platform Badge -->
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 bg-gradient-to-br ${platformColor} rounded-xl flex items-center justify-center text-2xl shadow-lg">
                ${platformIcon}
              </div>
              <div>
                <div class="text-xs text-white/60 uppercase tracking-wider font-semibold">${item.platform}</div>
                <span class="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-xs font-bold mt-1 shadow-lg">
                  ${item.category}
                </span>
              </div>
            </div>
            
            <!-- Product Name -->
            <h2 class="text-2xl md:text-3xl font-bold mb-3 leading-tight">${item.productName}</h2>
            
            <!-- Description -->
            <p class="text-white/70 text-sm md:text-base mb-6 line-clamp-3">${item.productDescription}</p>
            
            <!-- Metrics Grid -->
            <div class="grid grid-cols-2 gap-3 mb-6">
              <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover-lift">
                <div class="text-xs text-white/50 mb-1 font-medium uppercase tracking-wide">👁️ ${TEXT_CONFIG.metric_views}</div>
                <div class="text-xl font-bold">${formatNumber(item.statsNow.views)}</div>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover-lift">
                <div class="text-xs text-white/50 mb-1 font-medium uppercase tracking-wide">❤️ ${TEXT_CONFIG.metric_likes}</div>
                <div class="text-xl font-bold">${formatNumber(item.statsNow.likes)}</div>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover-lift">
                <div class="text-xs text-white/50 mb-1 font-medium uppercase tracking-wide">💬 ${TEXT_CONFIG.metric_comments}</div>
                <div class="text-xl font-bold">${formatNumber(item.statsNow.comments)}</div>
              </div>
              <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover-lift">
                <div class="text-xs text-white/50 mb-1 font-medium uppercase tracking-wide">📊 ${TEXT_CONFIG.metric_saturation}</div>
                <div class="text-xl font-bold ${satColor}">${item.saturationScore}</div>
              </div>
            </div>
            
            <!-- Price -->
            <div class="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 mb-6 border border-green-500/30">
              <div class="text-xs text-white/60 mb-1 font-medium uppercase tracking-wide">${TEXT_CONFIG.price_label}</div>
              <div class="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                ${item.priceRub} ₽
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-3">
              <button 
                id="save-btn-${item.id}"
                class="${item.saved 
                  ? 'flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold text-base shadow-lg shadow-green-500/30 hover-lift transition-all-smooth' 
                  : 'flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-base shadow-lg shadow-blue-500/30 hover-lift transition-all-smooth'}"
              >
                ${item.saved ? '✓ ' + TEXT_CONFIG.btn_saved : '📌 ' + TEXT_CONFIG.btn_save}
              </button>
              <a href="${item.url}" target="_blank" rel="noopener noreferrer" 
                 class="px-6 py-4 bg-white/10 rounded-xl font-medium hover-lift hover:bg-white/20 transition-all-smooth flex items-center justify-center">
                🔗
              </a>
            </div>
          </div>
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
    <div class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <!-- Enhanced Header -->
      <div class="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div class="py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  🔥
                </div>
                <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ${TEXT_CONFIG.app_name}
                </h1>
              </div>
              <div class="flex gap-2">
                <a href="/feed" class="px-6 py-2.5 bg-gray-200 text-gray-900 rounded-xl text-base font-medium hover-lift transition-all-smooth">
                  ${TEXT_CONFIG.tab_feed}
                </a>
                <a href="/dashboard" class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-base font-medium hover-lift shadow-lg shadow-blue-500/30 transition-all-smooth">
                  ${TEXT_CONFIG.tab_dashboard}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Enhanced KPIs -->
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-2xl p-6 shadow-xl hover-lift fade-in-up border border-gray-100" style="animation-delay: 0s">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                📦
              </div>
              <div class="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                ВСЕГО
              </div>
            </div>
            <div class="text-sm text-gray-600 mb-2 font-medium">Всего товаров</div>
            <div class="text-4xl font-bold text-gray-900">${totalItems}</div>
          </div>
          
          <div class="bg-white rounded-2xl p-6 shadow-xl hover-lift fade-in-up border border-gray-100" style="animation-delay: 0.1s">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                ✓
              </div>
              <div class="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                В РАБОТЕ
              </div>
            </div>
            <div class="text-sm text-gray-600 mb-2 font-medium">Сохранено</div>
            <div class="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">${savedItems.length}</div>
          </div>
          
          <div class="bg-white rounded-2xl p-6 shadow-xl hover-lift fade-in-up border border-gray-100" style="animation-delay: 0.2s">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                📊
              </div>
              <div class="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                МЕТРИКА
              </div>
            </div>
            <div class="text-sm text-gray-600 mb-2 font-medium">Ср. насыщенность</div>
            <div class="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">${avgSaturation}</div>
          </div>
        </div>
        
        <!-- Enhanced Trending Items with Growth -->
        <div class="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden fade-in-up border border-gray-100" style="animation-delay: 0.3s">
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="text-3xl">🚀</div>
              <h2 class="text-2xl font-bold text-white">Товары с ростом за 7 дней</h2>
            </div>
            <p class="text-blue-100">Топ-5 товаров с лучшей насыщенностью и растущими просмотрами</p>
          </div>
          
          <div class="divide-y divide-gray-100">
            ${trendingItems.map((item, idx) => {
              const growthPercent = ((item.growthData[6] - item.growthData[0]) / item.growthData[0] * 100).toFixed(1);
              const platformIcon = item.platform === 'tiktok' ? '🎵' : '📸';
              const platformColor = item.platform === 'tiktok' ? 'from-pink-500 to-red-500' : 'from-purple-500 to-pink-500';
              return `
                <div class="p-6 hover:bg-gray-50 transition-all-smooth">
                  <div class="flex items-start gap-4 mb-4">
                    <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br ${platformColor} rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      ${platformIcon}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-3 mb-2">
                        <div class="flex-1">
                          <h3 class="font-bold text-gray-900 text-lg mb-2">${item.productName}</h3>
                          <div class="flex flex-wrap items-center gap-2 mb-3">
                            <span class="px-3 py-1 bg-gradient-to-r ${platformColor} text-white rounded-full text-xs font-bold shadow-sm">
                              ${item.platform.toUpperCase()}
                            </span>
                            <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                              ${item.category}
                            </span>
                            <span class="px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 ${getSaturationColor(item.saturationScore)} rounded-full text-xs font-bold">
                              📊 ${item.saturationScore}
                            </span>
                          </div>
                        </div>
                        <div class="text-right flex-shrink-0">
                          <div class="text-xs text-gray-500 mb-1 font-medium">Просмотры</div>
                          <div class="text-2xl font-bold text-gray-900">${formatNumber(item.statsNow.views)}</div>
                        </div>
                      </div>
                      
                      <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4 border border-green-200">
                        <div class="flex items-center justify-between gap-4">
                          <div class="flex-1">
                            <div class="text-xs text-gray-600 mb-2 font-medium">📈 Динамика роста (7 дней)</div>
                            <div class="text-green-600 mb-2">${generateSparkline(item.growthData, 120, 32)}</div>
                          </div>
                          <div class="text-right">
                            <div class="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              +${growthPercent}%
                            </div>
                            <div class="text-xs text-gray-600 font-medium">прирост</div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="flex gap-3">
                        <a href="${item.url}" target="_blank" rel="noopener noreferrer" 
                           class="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-center text-sm font-bold hover-lift shadow-lg shadow-blue-500/30 transition-all-smooth">
                          🔗 ${TEXT_CONFIG.btn_open_post}
                        </a>
                        <button onclick="viewPostInModal('${item.id}')" 
                                class="flex-1 px-5 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 rounded-xl text-sm font-bold hover-lift transition-all-smooth">
                          👁️ Просмотреть пост
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <!-- Enhanced Saved Items Section -->
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden fade-in-up border border-gray-100" style="animation-delay: 0.4s">
          <div class="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="text-3xl">💼</div>
              <h2 class="text-2xl font-bold text-white">В работе</h2>
            </div>
            <p class="text-green-100">${savedItems.length === 0 ? 'Сохраните товары из ленты для дальнейшей работы' : `Сохранено ${savedItems.length} ${savedItems.length === 1 ? 'товар' : savedItems.length < 5 ? 'товара' : 'товаров'}`}</p>
          </div>
          
          <div class="divide-y divide-gray-100">
            ${savedItems.length === 0 ? `
              <div class="p-12 text-center">
                <div class="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center text-5xl">
                  📦
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3">${TEXT_CONFIG.empty_saved_title}</h3>
                <p class="text-gray-600 mb-6 max-w-md mx-auto">${TEXT_CONFIG.empty_saved_body}</p>
                <a href="/feed" class="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover-lift shadow-lg shadow-blue-500/30 transition-all-smooth">
                  🔥 Перейти в ленту
                </a>
              </div>
            ` : savedItems.map((item, idx) => {
              const platformIcon = item.platform === 'tiktok' ? '🎵' : '📸';
              const platformColor = item.platform === 'tiktok' ? 'from-pink-500 to-red-500' : 'from-purple-500 to-pink-500';
              return `
              <div class="p-6 hover:bg-gray-50 transition-all-smooth">
                <div class="flex items-start gap-4 mb-4">
                  <div class="flex-shrink-0 w-16 h-16 bg-gradient-to-br ${platformColor} rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    ${platformIcon}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-gray-900 text-lg mb-2">${item.productName}</h3>
                    <p class="text-sm text-gray-600 mb-3 line-clamp-2">${item.productDescription}</p>
                    
                    <div class="flex flex-wrap items-center gap-3 mb-4">
                      <div class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                        <span class="text-xs text-gray-600">👁️</span>
                        <span class="text-sm font-bold text-gray-900">${formatNumber(item.statsNow.views)}</span>
                      </div>
                      <div class="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                        <span class="text-xs text-gray-600">📊</span>
                        <span class="text-sm font-bold ${getSaturationColor(item.saturationScore)}">${item.saturationScore}</span>
                      </div>
                      <div class="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                        <span class="text-xs text-gray-600">💰</span>
                        <span class="text-sm font-bold text-green-600">${item.priceRub} ₽</span>
                      </div>
                      <div class="px-3 py-1.5 bg-gray-100 rounded-lg">
                        <span class="text-xs font-bold text-gray-700">${item.category}</span>
                      </div>
                    </div>
                    
                    <div class="flex gap-3">
                      <a href="${item.url}" target="_blank" rel="noopener noreferrer" 
                         class="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-center text-sm font-bold hover-lift shadow-lg shadow-blue-500/30 transition-all-smooth">
                        🔗 ${TEXT_CONFIG.btn_open_post}
                      </a>
                      <button onclick="viewPostInModal('${item.id}')" 
                              class="flex-1 px-5 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 rounded-xl text-sm font-bold hover-lift transition-all-smooth">
                        👁️ Просмотреть
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Enhanced Modal for viewing posts
function viewPostInModal(itemId) {
  const item = AppState.feedItems.find(i => i.id === itemId);
  if (!item) return;
  
  const platformIcon = item.platform === 'tiktok' ? '🎵' : '📸';
  const platformColor = item.platform === 'tiktok' ? 'from-pink-500 to-red-500' : 'from-purple-500 to-pink-500';
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'post-modal';
  modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
  modal.style.animation = 'fadeIn 0.2s ease-out';
  modal.onclick = (e) => {
    if (e.target === modal) closePostModal();
  };
  
  modal.innerHTML = `
    <div class="bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10">
      <div class="sticky top-0 glass-dark backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br ${platformColor} rounded-xl flex items-center justify-center text-2xl shadow-lg">
            ${platformIcon}
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">${item.productName}</h2>
            <div class="text-sm text-white/60">${item.platform.toUpperCase()}</div>
          </div>
        </div>
        <button onclick="closePostModal()" class="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white text-2xl transition-all-smooth hover-lift">
          ×
        </button>
      </div>
      
      <div class="p-6">
        <!-- Embed Container -->
        <div class="bg-black/40 rounded-2xl mb-6 flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl" style="min-height: 600px;" id="modal-embed-${item.id}">
          <div class="text-center p-8 fade-in">
            <div class="w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${platformColor} rounded-2xl flex items-center justify-center text-4xl shadow-lg">
              ${platformIcon}
            </div>
            <p class="text-white/80 text-lg font-medium mb-2">Загрузка контента...</p>
            <div class="mt-4 flex justify-center gap-2">
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
          </div>
        </div>
        
        <!-- Product Info -->
        <div class="glass-dark rounded-2xl p-6 mb-6 border border-white/10">
          <div class="flex items-center gap-2 mb-4">
            <span class="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-sm font-bold shadow-lg">
              ${item.category}
            </span>
            <span class="px-4 py-2 bg-gradient-to-r ${platformColor} rounded-xl text-sm font-bold shadow-lg">
              ${item.platform.toUpperCase()}
            </span>
          </div>
          
          <p class="text-white/80 text-base mb-6 leading-relaxed">${item.productDescription}</p>
          
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div class="text-xs text-white/50 mb-2 font-medium uppercase">👁️ ${TEXT_CONFIG.metric_views}</div>
              <div class="text-2xl font-bold text-white">${formatNumber(item.statsNow.views)}</div>
            </div>
            <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div class="text-xs text-white/50 mb-2 font-medium uppercase">❤️ ${TEXT_CONFIG.metric_likes}</div>
              <div class="text-2xl font-bold text-white">${formatNumber(item.statsNow.likes)}</div>
            </div>
            <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div class="text-xs text-white/50 mb-2 font-medium uppercase">💬 ${TEXT_CONFIG.metric_comments}</div>
              <div class="text-2xl font-bold text-white">${formatNumber(item.statsNow.comments)}</div>
            </div>
            <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div class="text-xs text-white/50 mb-2 font-medium uppercase">📊 ${TEXT_CONFIG.metric_saturation}</div>
              <div class="text-2xl font-bold ${getSaturationColor(item.saturationScore)}">${item.saturationScore}</div>
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-5 mb-6 border border-green-500/30">
            <div class="text-xs text-white/60 mb-2 font-medium uppercase">${TEXT_CONFIG.price_label}</div>
            <div class="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              ${item.priceRub} ₽
            </div>
          </div>
          
          <a href="${item.url}" target="_blank" rel="noopener noreferrer"
             class="block w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-center font-bold hover-lift shadow-lg shadow-blue-500/30 transition-all-smooth">
            🔗 ${TEXT_CONFIG.btn_open_post}
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

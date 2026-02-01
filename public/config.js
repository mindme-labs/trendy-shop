// TEXT_CONFIG - All UI text strings (MANDATORY)
const TEXT_CONFIG = {
  app_name: "TrendHunter",
  tab_feed: "Лента",
  tab_dashboard: "Дашборд",
  
  btn_save: "В работу",
  btn_saved: "Сохранено",
  btn_open_post: "Открыть пост",
  
  filter_category: "Категория",
  filter_all: "Все",
  cat_home: "Дом",
  cat_kids: "Дети",
  cat_tech: "Техника",
  
  sort_label: "Сортировка",
  sort_sat_asc: "По насыщенности (лучше → хуже)",
  sort_sat_desc: "По насыщенности (хуже → лучше)",
  sort_price_asc: "По цене (дешевле → дороже)",
  sort_price_desc: "По цене (дороже → дешевле)",
  sort_views_desc: "По просмотрам (сначала больше)",
  
  metric_views: "Просмотры",
  metric_likes: "Лайки",
  metric_comments: "Комментарии",
  metric_saturation: "Насыщенность",
  price_label: "Цена",
  
  fallback_embed_title: "Не удалось встроить пост",
  fallback_embed_body: "Откройте пост по ссылке или попробуйте позже.",
  
  empty_saved_title: "Пока пусто",
  empty_saved_body: "Сохраните товары из ленты в «В работу».",
  
  alert_saved: "Товар добавлен в «В работу»."
};

// POST_CONFIG - Source URLs for embedded posts
const POST_CONFIG = {
  tiktok: [
    "https://www.tiktok.com/@karissa.brighton/video/7599004879440416031",
    "https://www.tiktok.com/@karissa.brighton/video/7598275974974704926",
    "https://www.tiktok.com/@karissa.brighton/video/7597894830575848734",
    "https://www.tiktok.com/@karissa.brighton/video/7597511240868564254",
    "https://www.tiktok.com/@karissa.brighton/video/7597181792952569119",
    "https://www.tiktok.com/@karissa.brighton/video/7596780691359091999",
    "https://www.tiktok.com/@karissa.brighton/video/7595667396921134366",
    "https://www.tiktok.com/@karissa.brighton/video/7594949743646674206",
    "https://www.tiktok.com/@karissa.brighton/video/7594555155895438622",
    "https://www.tiktok.com/@karissa.brighton/video/7594212911170522399"
  ],
  instagram: [
    "https://www.instagram.com/reel/DFpu68xMsxg/",
    "https://www.instagram.com/reel/DIcEswNSPoj/",
    "https://www.instagram.com/reel/DSGApwPEiVJ/",
    "https://www.instagram.com/reel/DKFeKN-KGhj/",
    "https://www.instagram.com/reel/C_56_JCxiwp/",
    "https://www.instagram.com/reel/C-RPOaJv7-L/",
    "https://www.instagram.com/reel/DJ-W83hu0nc/",
    "https://www.instagram.com/reel/DRpNs_uj06H/",
    "https://www.instagram.com/reel/DIkZhm6PkIB/",
    "https://www.instagram.com/reel/DKpVH56MU87/"
  ]
};

// URL Normalization function
function normalizeURL(url) {
  try {
    const urlObj = new URL(url);
    // Strip query parameters and fragments
    urlObj.search = '';
    urlObj.hash = '';
    let normalized = urlObj.toString();
    
    // Ensure trailing slash for Instagram
    if (normalized.includes('instagram.com/reel/') || normalized.includes('instagram.com/p/')) {
      if (!normalized.endsWith('/')) {
        normalized += '/';
      }
    }
    
    return normalized;
  } catch (e) {
    return url;
  }
}

// Validate URL format
function validateURL(url, platform) {
  const normalized = normalizeURL(url);
  
  if (platform === 'tiktok') {
    return /^https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+$/.test(normalized);
  } else if (platform === 'instagram') {
    return /^https:\/\/www\.instagram\.com\/(reel|p)\/[\w-]+\/$/.test(normalized);
  }
  
  return false;
}

// Process and normalize all URLs in POST_CONFIG
const NORMALIZED_POST_CONFIG = {
  tiktok: POST_CONFIG.tiktok.map(normalizeURL).filter(url => validateURL(url, 'tiktok')),
  instagram: POST_CONFIG.instagram.map(normalizeURL).filter(url => validateURL(url, 'instagram'))
};

// Mock product data generator
function generateProductData(url, index, platform) {
  const categories = [TEXT_CONFIG.cat_home, TEXT_CONFIG.cat_kids, TEXT_CONFIG.cat_tech];
  const category = categories[index % categories.length];
  
  // Product name ideas based on category
  const productNames = {
    [TEXT_CONFIG.cat_home]: [
      "Умный диспенсер для мыла",
      "Органайзер для кухонных принадлежностей",
      "Светодиодная подсветка для шкафа",
      "Автоматический освежитель воздуха",
      "Силиконовые крышки для посуды",
      "Магнитный держатель для ножей",
      "Складная сушилка для посуды",
      "Умный дозатор воды для домашних животных"
    ],
    [TEXT_CONFIG.cat_kids]: [
      "Интерактивная обучающая книга",
      "Набор для творчества 3D ручка",
      "Детский проектор звездного неба",
      "Складной игровой домик-палатка",
      "Музыкальный развивающий коврик",
      "Конструктор с LED-подсветкой",
      "Детские умные часы с GPS"
    ],
    [TEXT_CONFIG.cat_tech]: [
      "Беспроводная зарядка 3-в-1",
      "Умная LED-лампа с управлением",
      "Портативный мини-проектор",
      "Bluetooth-трекер для ключей",
      "USB-хаб с быстрой зарядкой",
      "Складные Bluetooth-наушники",
      "Умная розетка с таймером"
    ]
  };
  
  const descriptions = {
    [TEXT_CONFIG.cat_home]: [
      "Это просто находка для ванной! Автоматически дозирует мыло, очень удобно 🧼",
      "Наконец-то порядок на кухне! Все под рукой и занимает мало места",
      "Установил за 2 минуты, теперь всё видно даже ночью ✨",
      "Работает по датчику, запах всегда свежий, рекомендую!",
      "Подходят на любую посуду, больше не нужна пищевая пленка 👌",
      "Освободил столько места! Ножи всегда под рукой",
      "Складывается после использования, не занимает место на столе"
    ],
    [TEXT_CONFIG.cat_kids]: [
      "Ребенок в восторге! Учит буквы играя, очень интересно 📚",
      "Невероятная вещь! Можно создавать 3D-фигуры прямо в воздухе",
      "Засыпает под звездным небом, очень красиво 🌟",
      "Дети играют часами! Легко собирается и разбирается",
      "Развивает моторику и музыкальный слух, качество отличное",
      "Светится в темноте! Можно строить что угодно 🔦"
    ],
    [TEXT_CONFIG.cat_tech]: [
      "Заряжает телефон, часы и наушники одновременно! Класс 🔋",
      "Меняет цвет через приложение, создает атмосферу",
      "Размером с телефон, а проецирует на всю стену! 📽️",
      "Прикрепил к ключам, теперь всегда нахожу их за секунду",
      "6 портов USB, заряжает всё и сразу, быстро!",
      "Звук отличный, складываются компактно для поездок 🎧"
    ]
  };
  
  const nameList = productNames[category];
  const descList = descriptions[category];
  
  const productName = nameList[index % nameList.length];
  const productDescription = descList[index % descList.length];
  
  // Generate realistic stats
  const views = Math.floor(Math.random() * (6000000 - 20000) + 20000);
  const likes = Math.floor(Math.random() * (400000 - 300) + 300);
  const comments = Math.floor(Math.random() * (25000 - 10) + 10);
  
  // Price range by category
  const priceRanges = {
    [TEXT_CONFIG.cat_home]: [500, 3000],
    [TEXT_CONFIG.cat_kids]: [800, 5000],
    [TEXT_CONFIG.cat_tech]: [1000, 8000]
  };
  
  const [minPrice, maxPrice] = priceRanges[category];
  const priceRub = Math.floor(Math.random() * (maxPrice - minPrice) + minPrice);
  
  // Calculate saturation score
  const saturationScore = views / (likes + comments);
  
  return {
    id: `${platform}-${index}`,
    platform: platform,
    url: url,
    productName: productName,
    productDescription: productDescription,
    category: category,
    priceRub: priceRub,
    statsNow: {
      views: views,
      likes: likes,
      comments: comments
    },
    saturationScore: parseFloat(saturationScore.toFixed(1)),
    saved: false
  };
}

// Generate feed items from normalized URLs
function generateFeedItems() {
  const items = [];
  
  NORMALIZED_POST_CONFIG.tiktok.forEach((url, index) => {
    items.push(generateProductData(url, index, 'tiktok'));
  });
  
  NORMALIZED_POST_CONFIG.instagram.forEach((url, index) => {
    items.push(generateProductData(url, index + NORMALIZED_POST_CONFIG.tiktok.length, 'instagram'));
  });
  
  return items;
}

// Export for use in tests (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TEXT_CONFIG,
    POST_CONFIG,
    NORMALIZED_POST_CONFIG,
    normalizeURL,
    validateURL,
    generateFeedItems
  };
}

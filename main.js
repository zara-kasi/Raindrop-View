const { Plugin, PluginSettingTab, Setting, Notice, MarkdownView } = require('obsidian');

class RaindropPlugin extends Plugin {
constructor(app, manifest) {
  super(app, manifest);
  this.cache = new Map();
  this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
}
refreshActiveViews() {
  // Force re-render of any active raindrop blocks
  this.app.workspace.trigger('resize');
}

async onload() {
  try {
    console.log('Loading Raindrop.io Plugin');
    
    // Load settings first
    await this.loadSettings();
    
// Add command for generating tags chart
this.addCommand({
  id: 'generate-tags-chart',
  name: 'Generate Tags Chart',
  callback: () => {
    this.generateTagsChart();
  }
    });
    // Register code block processors
    this.registerMarkdownCodeBlockProcessor('raindrop', this.processRaindropCodeBlock.bind(this));
    this.registerMarkdownCodeBlockProcessor('raindrop-search', this.processRaindropSearchCodeBlock.bind(this));
    
    // Register inline link processor
    this.registerMarkdownPostProcessor(this.processInlineLinks.bind(this));
    
    // Add plugin settings
    this.addSettingTab(new RaindropSettingTab(this.app, this));
    
    console.log('Raindrop.io Plugin loaded successfully');
  } catch (error) {
    console.error('Failed to load Raindrop.io Plugin:', error);
    throw error;
  }
}

  async loadSettings() {
    this.settings = Object.assign({}, {
      apiToken: '',
      defaultLayout: 'card',
      showCoverImages: true,
      showTags: true,
      showExcerpts: false,
      showDomain: false,
      gridColumns: 3,
      itemsPerPage: 20
      autoGenerateChart: false,
    }, await this.loadData());
  }

async saveSettings() {
  await this.saveData(this.settings);
  this.refreshActiveViews();
}

  async processRaindropCodeBlock(source, el, ctx) {
    try {
      const config = this.parseCodeBlockConfig(source);
      const data = await this.fetchRaindropData(config);
      this.renderRaindropData(el, data, config);
    } catch (error) {
      this.renderError(el, error.message);
    }
  }

  async processRaindropSearchCodeBlock(source, el, ctx) {
    try {
      const config = this.parseSearchCodeBlockConfig(source);
      this.renderSearchInterface(el, config);
    } catch (error) {
      this.renderError(el, error.message);
    }
  }

  parseCodeBlockConfig(source) {
    const config = {};
    const lines = source.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        config[key] = value;
      }
    }
    
    // Set defaults
    config.layout = config.layout || this.settings.defaultLayout;
    config.page = config.page || 0;
    config.perpage = config.perpage || this.settings.itemsPerPage;
    
    return config;
  }

  parseSearchCodeBlockConfig(source) {
    const config = { type: 'search' };
    const lines = source.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        config[key] = value;
      }
    }
    
    config.layout = config.layout || this.settings.defaultLayout;
    config.perpage = config.perpage || this.settings.itemsPerPage;
    
    return config;
  }

  async processInlineLinks(el, ctx) {
    const inlineLinks = el.querySelectorAll('a[href^="raindrop:"]');
    
    for (const link of inlineLinks) {
      const href = link.getAttribute('href');
      try {
        const config = this.parseInlineLink(href);
        const data = await this.fetchRaindropData(config);
        
        const container = document.createElement('div');
        container.className = 'raindrop-inline-container';
        this.renderRaindropData(container, data, config);
        
        link.parentNode.replaceChild(container, link);
      } catch (error) {
        this.renderError(link, error.message);
      }
    }
  }

  parseInlineLink(href) {
    // Parse: raindrop:collection/123 or raindrop:bookmarks or raindrop:user
    const parts = href.replace('raindrop:', '').split('/');
    
    if (parts.length === 0) {
      throw new Error('Invalid Raindrop link format');
    }
    
    const config = {
      layout: 'card',
      perpage: 10
    };
    
    if (parts[0] === 'bookmarks') {
      config.type = 'bookmarks';
      config.collection = parts[1] || 0; // 0 = all bookmarks
    } else if (parts[0] === 'collections') {
      config.type = 'collections';
    } else if (parts[0] === 'user') {
      config.type = 'user';
    } else if (parts[0] === 'collection') {
      config.type = 'bookmarks';
      config.collection = parts[1] || 0;
    }
    
    return config;
  }

  async fetchRaindropData(config) {
    if (!this.settings.apiToken) {
      throw new Error('API Token is required. Please set it in plugin settings.');
    }

    const cacheKey = JSON.stringify(config);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    let url;
    const headers = {
      'Authorization': `Bearer ${this.settings.apiToken}`,
      'Content-Type': 'application/json'
    };
    
   if (config.type === 'collections') {
  url = 'https://api.raindrop.io/rest/v1/collections';
} else if (config.type === 'search') {
  const searchParams = new URLSearchParams({
    search: config.search || '',
    page: config.page || 0,
    perpage: config.perpage || this.settings.itemsPerPage
  });
  
  if (config.collection && config.collection !== '0') {
    url = `https://api.raindrop.io/rest/v1/raindrops/${config.collection}?${searchParams}`;
  } else {
    url = `https://api.raindrop.io/rest/v1/raindrops/0?${searchParams}`;
  }
} else {
  // Default to bookmarks
  const collectionId = config.collection || 0;
  const searchParams = new URLSearchParams({
    page: config.page || 0,
    perpage: config.perpage || this.settings.itemsPerPage
  });
  
  if (config.search) {
    searchParams.append('search', config.search);
  }
  
  url = `https://api.raindrop.io/rest/v1/raindrops/${collectionId}?${searchParams}`;
   }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API Token. Please check your settings.');
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }

renderSearchInterface(el, config) {
  el.empty();
  el.className = 'raindrop-search-container';
  
  // Create search wrapper with icon
  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'raindrop-search-wrapper';
  
  
  // Create search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'raindrop-search-input';
  searchInput.placeholder = 'Search Bookmark...';
  
  // Assemble search wrapper
  searchWrapper.appendChild(searchInput);
  el.appendChild(searchWrapper);
  
  // Create results container
  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'raindrop-search-results';
  el.appendChild(resultsDiv);
  
  // State management
  let currentPage = 0;
  let totalResults = 0;
  let currentSearch = '';
  let isLoading = false;
  
  // Add event listeners
  let searchTimeout;
  
  const performSearch = async (searchTerm = null, page = 0, resetResults = true) => {
    if (isLoading) return;
    
    const query = searchTerm !== null ? searchTerm : searchInput.value.trim();
    
    if (query.length < 2) {
      resultsDiv.innerHTML = '';
      return;
    }
    
    try {
      isLoading = true;
      currentSearch = query;
      currentPage = page;
      
      if (resetResults) {
        resultsDiv.innerHTML = '<div class="raindrop-search-loading">Searching...</div>';
      } else {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'raindrop-search-loading';
        loadingDiv.textContent = 'Loading more...';
        resultsDiv.appendChild(loadingDiv);
      }
      
      const searchConfig = {
        ...config,
        type: 'search',
        search: query,
        page: page,
        perpage: config.perpage || this.settings.itemsPerPage
      };
      
      const data = await this.fetchRaindropData(searchConfig);
      
      if (resetResults) {
        resultsDiv.innerHTML = '';
        totalResults = data.count || 0;
      } else {
        const loadingEl = resultsDiv.querySelector('.raindrop-search-loading');
        if (loadingEl) loadingEl.remove();
      }
      
      if (data.items && data.items.length > 0) {
        if (resetResults) {
          this.renderBookmarks(resultsDiv, data.items, searchConfig);
        } else {
          const tempDiv = document.createElement('div');
          this.renderBookmarks(tempDiv, data.items, searchConfig);
          
          while (tempDiv.firstChild) {
            if (tempDiv.firstChild.className === 'raindrop-cards-grid') {
              const existingGrid = resultsDiv.querySelector('.raindrop-cards-grid');
              if (existingGrid) {
                while (tempDiv.firstChild.firstChild) {
                  existingGrid.appendChild(tempDiv.firstChild.firstChild);
                }
                tempDiv.removeChild(tempDiv.firstChild);
              }
            } else {
              resultsDiv.appendChild(tempDiv.firstChild);
            }
          }
        }
        
        if (data.items.length === (config.perpage || this.settings.itemsPerPage) && 
            (page + 1) * (config.perpage || this.settings.itemsPerPage) < totalResults) {
          const loadMoreBtn = document.createElement('button');
          loadMoreBtn.textContent = 'Load More';
          loadMoreBtn.className = 'raindrop-load-more-btn';
          loadMoreBtn.onclick = () => {
            loadMoreBtn.remove();
            performSearch(null, currentPage + 1, false);
          };
          resultsDiv.appendChild(loadMoreBtn);
        }
      } else if (resetResults) {
        resultsDiv.innerHTML = '<div class="raindrop-search-message">No bookmarks found.</div>';
      }
      
    } catch (error) {
      this.renderError(resultsDiv, error.message);
    } finally {
      isLoading = false;
    }
  };
  
  // Event listeners
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performSearch(), 300);
  });
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchTimeout);
      performSearch();
    }
  });
  
  // Focus effect
  searchInput.addEventListener('focus', () => {
    searchWrapper.classList.add('focused');
  });
  
  searchInput.addEventListener('blur', () => {
    searchWrapper.classList.remove('focused');
  });
      }

  renderRaindropData(el, data, config) {
    el.empty();
    el.className = 'raindrop-container';
    
    if (config.type === 'collections') {
      this.renderCollections(el, data.items, config);
    } else if (config.type === 'user') {
      this.renderUserInfo(el, data.user);
    } else {
      // Default to bookmarks
      this.renderBookmarks(el, data.items, config);
    }
  }

  renderCollections(el, collections, config) {
    if (config.layout === 'table') {
      this.renderCollectionsTable(el, collections);
    } else {
      this.renderCollectionsGrid(el, collections);
    }
  }

  renderCollectionsGrid(el, collections) {
    const gridDiv = document.createElement('div');
gridDiv.className = 'raindrop-cards-grid';
gridDiv.style.setProperty('--raindrop-grid-columns', this.settings.gridColumns);
gridDiv.setAttribute('data-columns', this.settings.gridColumns);
    
    collections.forEach(collection => {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'raindrop-collection-card';
      
      if (this.settings.showCoverImages && collection.cover && collection.cover.length > 0) {
        const img = document.createElement('img');
        img.src = collection.cover[0];
        img.alt = collection.title;
        img.className = 'collection-cover';
        cardDiv.appendChild(img);
      }
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'collection-info';
      
      const titleElement = document.createElement('h4');
      titleElement.textContent = collection.title;
      infoDiv.appendChild(titleElement);
      
      const countElement = document.createElement('div');
      countElement.className = 'collection-count';
      countElement.textContent = `${collection.count} bookmarks`;
      infoDiv.appendChild(countElement);
      
      if (collection.description) {
        const descElement = document.createElement('div');
        descElement.className = 'collection-description';
        descElement.textContent = collection.description;
        infoDiv.appendChild(descElement);
      }
      
      cardDiv.appendChild(infoDiv);
      gridDiv.appendChild(cardDiv);
    });
    
    el.appendChild(gridDiv);
  }

  renderCollectionsTable(el, collections) {
    const table = document.createElement('table');
    table.className = 'raindrop-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Title', 'Count', 'Description'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    collections.forEach(collection => {
      const row = document.createElement('tr');
      
      const titleCell = document.createElement('td');
      titleCell.textContent = collection.title;
      row.appendChild(titleCell);
      
      const countCell = document.createElement('td');
      countCell.textContent = collection.count;
      row.appendChild(countCell);
      
      const descCell = document.createElement('td');
      descCell.textContent = collection.description || '-';
      row.appendChild(descCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    el.appendChild(table);
  }

  renderUserInfo(el, user) {
    const userDiv = document.createElement('div');
    userDiv.className = 'raindrop-user-info';
    
    const userHtml = `
      <div class="user-header">
        <h3>${user.fullName}</h3>
        <div class="user-email">${user.email}</div>
      </div>
      <div class="user-stats">
        <div class="stat-item">
          <span class="stat-label">Collections:</span>
          <span class="stat-value">${user.groups.length}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Plan:</span>
          <span class="stat-value">${user.pro ? 'Pro' : 'Free'}</span>
        </div>
      </div>
    `;
    
    userDiv.innerHTML = userHtml;
    el.appendChild(userDiv);
  }

  renderBookmarks(el, bookmarks, config) {
    if (!bookmarks || bookmarks.length === 0) {
      el.innerHTML = '<div class="raindrop-empty">No bookmarks found.</div>';
      return;
    }
    
    if (config.layout === 'table') {
      this.renderBookmarksTable(el, bookmarks);
    } else {
      this.renderBookmarksGrid(el, bookmarks);
    }
  }

  renderBookmarksGrid(el, bookmarks) {
    const gridDiv = document.createElement('div');
gridDiv.className = 'raindrop-cards-grid';
gridDiv.style.setProperty('--raindrop-grid-columns', this.settings.gridColumns);
gridDiv.setAttribute('data-columns', this.settings.gridColumns);
    
    bookmarks.forEach(bookmark => {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'raindrop-bookmark-card';
      
      if (this.settings.showCoverImages && bookmark.cover) {
        const img = document.createElement('img');
        img.src = bookmark.cover;
        img.alt = bookmark.title;
        img.className = 'bookmark-cover';
        cardDiv.appendChild(img);
      }
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'bookmark-info';
      
      // Title as clickable link
      const titleElement = document.createElement('h4');
      const titleLink = document.createElement('a');
      titleLink.href = bookmark.link;
      titleLink.target = '_blank';
      titleLink.rel = 'noopener noreferrer';
      titleLink.className = 'bookmark-title-link';
      titleLink.textContent = bookmark.title;
      titleElement.appendChild(titleLink);
      infoDiv.appendChild(titleElement);
      
      // Domain
      if (this.settings.showDomain && bookmark.domain) {
        const domainElement = document.createElement('div');
        domainElement.className = 'bookmark-domain';
        domainElement.textContent = bookmark.domain;
        infoDiv.appendChild(domainElement);
      }
      
      // Excerpt
      if (this.settings.showExcerpts && bookmark.excerpt) {
        const excerptElement = document.createElement('div');
        excerptElement.className = 'bookmark-excerpt';
        excerptElement.textContent = bookmark.excerpt;
        infoDiv.appendChild(excerptElement);
      }
      
      // Tags
      if (this.settings.showTags && bookmark.tags && bookmark.tags.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'bookmark-tags';
        bookmark.tags.forEach(tag => {
          const tagElement = document.createElement('span');
          tagElement.className = 'bookmark-tag';
          tagElement.textContent = tag;
          tagsDiv.appendChild(tagElement);
        });
        infoDiv.appendChild(tagsDiv);
      }
      
      // Date
      const dateElement = document.createElement('div');
      dateElement.className = 'bookmark-date';
      dateElement.textContent = new Date(bookmark.created).toLocaleDateString();
      infoDiv.appendChild(dateElement);
      
      cardDiv.appendChild(infoDiv);
      gridDiv.appendChild(cardDiv);
    });
    
    el.appendChild(gridDiv);
  }

  renderBookmarksTable(el, bookmarks) {
    const table = document.createElement('table');
    table.className = 'raindrop-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Title', 'Domain', 'Tags', 'Date'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    bookmarks.forEach(bookmark => {
      const row = document.createElement('tr');
      
      // Title cell
      const titleCell = document.createElement('td');
      const titleLink = document.createElement('a');
      titleLink.href = bookmark.link;
      titleLink.target = '_blank';
      titleLink.rel = 'noopener noreferrer';
      titleLink.className = 'bookmark-title-link';
      titleLink.textContent = bookmark.title;
      titleCell.appendChild(titleLink);
      row.appendChild(titleCell);
      
      // Domain cell
      const domainCell = document.createElement('td');
      domainCell.textContent = bookmark.domain || '-';
      row.appendChild(domainCell);
      
     // Tags cell
      const tagsCell = document.createElement('td');
      if (bookmark.tags && bookmark.tags.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'bookmark-tags-table';
        bookmark.tags.slice(0, 3).forEach(tag => {
          const tagElement = document.createElement('span');
          tagElement.className = 'bookmark-tag';
          tagElement.textContent = tag;
          tagsDiv.appendChild(tagElement);
        });
        tagsCell.appendChild(tagsDiv);
      } else {
        tagsCell.textContent = '-';
      }
      row.appendChild(tagsCell);
      
      // Date cell
      const dateCell = document.createElement('td');
      dateCell.textContent = new Date(bookmark.created).toLocaleDateString();
      row.appendChild(dateCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    el.appendChild(table);
  }

  renderError(el, message) {
    el.innerHTML = `<div class="raindrop-error">Error: ${message}</div>`;
  }

  onunload() {
    console.log('Unloading Raindrop.io Plugin');
  }
  // Add this method to your RaindropPlugin class
async generateTagsChart() {
  try {
    if (!this.settings.apiToken) {
      new Notice('API Token is required. Please set it in plugin settings.');
      return;
    }

    // Get the active editor
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      new Notice('No active markdown view found.');
      return;
    }

    const editor = activeView.editor;

    // Show loading notice
    const loadingNotice = new Notice('Fetching bookmarks and generating chart...', 0);

    // Fetch all bookmarks from all collections
    const allBookmarks = await this.fetchAllBookmarks();

    if (!allBookmarks || allBookmarks.length === 0) {
      loadingNotice.hide();
      new Notice('No bookmarks found.');
      return;
    }

    // Build tag frequency map
    const tagFrequency = this.buildTagFrequencyMap(allBookmarks);

    if (Object.keys(tagFrequency).length === 0) {
      loadingNotice.hide();
      new Notice('No tags found in your bookmarks.');
      return;
    }

    // Generate chart code block
    const chartCodeBlock = this.generateChartCodeBlock(tagFrequency);

    // Insert at cursor position
    editor.replaceSelection(chartCodeBlock);

    loadingNotice.hide();
    new Notice(`Chart generated with ${Object.keys(tagFrequency).length} tags!`);

  } catch (error) {
    console.error('Error generating tags chart:', error);
    new Notice(`Error generating chart: ${error.message}`);
  }
}

// Fetch all bookmarks from all collections
async fetchAllBookmarks() {
  const allBookmarks = [];
  let page = 0;
  const perPage = 50; // Maximum allowed by API

  try {
    while (true) {
      const config = {
        type: 'bookmarks',
        collection: 0, // 0 = all bookmarks
        page: page,
        perpage: perPage
      };

      const data = await this.fetchRaindropData(config);
      
      if (!data.items || data.items.length === 0) {
        break;
      }

      allBookmarks.push(...data.items);

      // If we got fewer items than requested, we've reached the end
      if (data.items.length < perPage) {
        break;
      }

      page++;
    }

    return allBookmarks;
  } catch (error) {
    throw new Error(`Failed to fetch bookmarks: ${error.message}`);
  }
}

// Build tag frequency map from bookmarks
buildTagFrequencyMap(bookmarks) {
  const tagFrequency = {};

  bookmarks.forEach(bookmark => {
    if (bookmark.tags && Array.isArray(bookmark.tags)) {
      bookmark.tags.forEach(tag => {
        if (tag && tag.trim()) {
          const cleanTag = tag.trim();
          tagFrequency[cleanTag] = (tagFrequency[cleanTag] || 0) + 1;
        }
      });
    }
  });

  return tagFrequency;
}

// Generate chart code block in Obsidian Charts format
generateChartCodeBlock(tagFrequency) {
  // Sort tags by frequency (descending)
  const sortedTags = Object.entries(tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20); // Limit to top 20 tags for better readability

  if (sortedTags.length === 0) {
    return '```chart\n# No tags found\n```';
  }

  const labels = sortedTags.map(([tag]) => tag);
  const data = sortedTags.map(([, count]) => count);

  // Generate the chart code block
  const chartConfig = `\`\`\`chart
type: bar
labels: ${JSON.stringify(labels)}
series:
  - title: Bookmarks per Tag
    data: ${JSON.stringify(data)}
indexAxis: y
beginAtZero: true
labelColors: true
stacked: true
tension: 0.2
width: 80%
labelPosition: top
fill: false
\`\`\``;

  return chartConfig;
}

}

class RaindropSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    
    containerEl.createEl('h2', { text: 'Raindrop.io Integration Settings' });
    
    // API Token setting
    new Setting(containerEl)
      .setName('API Token')
      .setDesc('Your Raindrop.io API token. Get it from https://app.raindrop.io/settings/integrations')
      .addText(text => text
        .setPlaceholder('Enter your API token')
        .setValue(this.plugin.settings.apiToken)
        .onChange(async (value) => {
          this.plugin.settings.apiToken = value;
          await this.plugin.saveSettings();
        }));
    
    // Default Layout setting
    new Setting(containerEl)
      .setName('Default Layout')
      .setDesc('Choose the default layout for bookmark lists')
      .addDropdown(dropdown => dropdown
        .addOption('card', 'Card Layout')
        .addOption('table', 'Table Layout')
        .setValue(this.plugin.settings.defaultLayout)
        .onChange(async (value) => {
          this.plugin.settings.defaultLayout = value;
          await this.plugin.saveSettings();
        }));
    
    // Grid Columns setting
    new Setting(containerEl)
      .setName('Grid Columns')
      .setDesc('Number of columns in card grid layout')
      .addSlider(slider => slider
        .setLimits(1, 4, 1)
        .setValue(this.plugin.settings.gridColumns)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.gridColumns = value;
          await this.plugin.saveSettings();
        }));
    
    // Show Cover Images setting
    new Setting(containerEl)
      .setName('Show Cover Images')
      .setDesc('Display cover images for bookmarks')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showCoverImages)
        .onChange(async (value) => {
          this.plugin.settings.showCoverImages = value;
          await this.plugin.saveSettings();
        }));
    
    // Show Tags setting
    new Setting(containerEl)
      .setName('Show Tags')
      .setDesc('Display bookmark tags')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTags)
        .onChange(async (value) => {
          this.plugin.settings.showTags = value;
          await this.plugin.saveSettings();
        }));
    
    // Show Excerpts setting
    new Setting(containerEl)
      .setName('Show Excerpts')
      .setDesc('Display bookmark excerpts/descriptions')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showExcerpts)
        .onChange(async (value) => {
          this.plugin.settings.showExcerpts = value;
          await this.plugin.saveSettings();
        }));
    
    // Show Domain setting
    new Setting(containerEl)
      .setName('Show Domain')
      .setDesc('Display bookmark domains')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showDomain)
        .onChange(async (value) => {
          this.plugin.settings.showDomain = value;
          await this.plugin.saveSettings();
        }));
    
    
    // Items Per Page setting
    new Setting(containerEl)
      .setName('Items Per Page')
      .setDesc('Number of items to load per page')
      .addSlider(slider => slider
        .setLimits(5, 50, 5)
        .setValue(this.plugin.settings.itemsPerPage)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.itemsPerPage = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
  .setName('Auto-generate Chart')
  .setDesc('Automatically generate tags chart when fetching bookmarks')
  .addToggle(toggle => toggle
    .setValue(this.plugin.settings.autoGenerateChart)
    .onChange(async (value) => {
      this.plugin.settings.autoGenerateChart = value;
      await this.plugin.saveSettings();
    }));
    
    // API Instructions
    const apiInstructions = containerEl.createEl('div', { cls: 'setting-item-description' });
    apiInstructions.innerHTML = `
      <h3>Getting your API Token:</h3>
      <ol>
        <li>Go to <a href="https://app.raindrop.io/settings/integrations" target="_blank">Raindrop.io Integrations</a></li>
        <li>Click "Create new app"</li>
        <li>Fill in any name (e.g., "Obsidian Integration")</li>
        <li>Copy the "Test token" that appears</li>
        <li>Paste it in the API Token field above</li>
      </ol>
    `;
  }
}

module.exports = {
  default: RaindropPlugin
};

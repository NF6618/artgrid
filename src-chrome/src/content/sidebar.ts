import type { MediaEntry } from './types';

export class MediaSidebar {
  host: HTMLElement;
  shadow: ShadowRoot;
  state: {
    open: boolean;
    pinned: boolean;
    items: MediaEntry[];
    selected: Set<string>;
    filters: { minSize: number; hideDuplicates: boolean; mediaType: string };
  };

  rescanCallback: () => void;

  constructor(rescanCallback: () => void) {
    this.rescanCallback = rescanCallback;
    this.host = document.createElement('div');
    this.host.id = 'bg-media-sidebar-host';
    this.host.style.cssText = 'position:fixed; top:16px; right:16px; z-index:2147483647;';
    document.documentElement.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'closed' });
    this.state = { 
      open: false, 
      pinned: false, 
      items: [], 
      selected: new Set(), 
      filters: { minSize: 0, hideDuplicates: false, mediaType: 'all' } 
    };

    // Load pin state
    chrome.storage.session.get([`pinned:${location.hostname}`], (res) => {
      if (res[`pinned:${location.hostname}`]) {
        this.state.pinned = true;
        this.state.open = true;
      }
      this.render();
    });
  }

  toggle() {
    this.state.open = !this.state.open;
    if (!this.state.open) {
      this.state.pinned = false;
      chrome.storage.session.set({ [`pinned:${location.hostname}`]: false });
    }
    this.render();
  }
  
  togglePin() {
    this.state.pinned = !this.state.pinned;
    chrome.storage.session.set({ [`pinned:${location.hostname}`]: this.state.pinned });
    this.render();
  }

  render() {
    this.shadow.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = `
      :host { font-family: system-ui, sans-serif; }
      .bg-toggle { background: #2563eb; color: white; border: none; border-radius: 50%; width: 48px; height: 48px; font-size: 24px; cursor: pointer; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); position: absolute; right: 0; top: 0; z-index: 2; transition: transform 0.2s; }
      .bg-toggle:hover { transform: scale(1.05); }
      .bg-panel { position: absolute; right: 0; top: 0; width: 360px; max-height: calc(100vh - 32px); background: #1f2937; border-radius: 12px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.5); display: flex; flex-direction: column; overflow: hidden; color: #e5e7eb; border: 1px solid #374151; }
      .bg-header { padding: 16px; background: #111827; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #374151; }
      .bg-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
      .bg-header-actions { display: flex; gap: 8px; margin-right: 48px; }
      .bg-btn { background: #374151; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
      .bg-btn:hover { background: #4b5563; }
      .bg-btn.active { background: #2563eb; }
      .bg-filterbar { padding: 12px 16px; display: flex; gap: 12px; border-bottom: 1px solid #374151; background: #1f2937; align-items: center; flex-wrap: wrap; }
      .bg-filterbar select, .bg-filterbar input { background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; padding: 4px; font-size: 12px; }
      .bg-filterbar label { font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer; }
      .bg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 16px; overflow-y: auto; flex: 1; }
      .bg-cell { position: relative; aspect-ratio: 1; background: #111827; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; }
      .bg-cell.selected { border-color: #3b82f6; }
      .bg-cell img { width: 100%; height: 100%; object-fit: cover; }
      .bg-cell input[type="checkbox"] { position: absolute; top: 6px; left: 6px; z-index: 10; margin: 0; width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6; }
      .bg-badge, .bg-video-badge { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; pointer-events: none; }
      .bg-cell-disabled { opacity: 0.5; filter: grayscale(1); }
      .bg-footer { padding: 16px; background: #111827; border-top: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; }
      .bg-download-btn { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; }
      .bg-download-btn:disabled { background: #374151; color: #9ca3af; cursor: not-allowed; }
      .bg-toast { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2563eb; color: white; padding: 8px 16px; border-radius: 20px; font-size: 13px; z-index: 100; pointer-events: none; opacity: 0; transition: opacity 0.3s; }
    `;
    this.shadow.appendChild(style);

    const toggle = document.createElement('button');
    toggle.className = 'bg-toggle';
    toggle.textContent = this.state.open ? '×' : '☰';
    toggle.addEventListener('click', () => this.toggle());
    this.shadow.appendChild(toggle);

    if (this.state.open || this.state.pinned) {
      this.shadow.appendChild(this.buildPanel());
    }
  }

  buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'bg-panel';
    panel.appendChild(this.buildHeader());
    panel.appendChild(this.buildFilterBar());
    
    const gridContainer = document.createElement('div');
    gridContainer.style.overflowY = 'auto';
    gridContainer.style.flex = '1';
    gridContainer.appendChild(this.buildGrid());
    panel.appendChild(gridContainer);
    
    panel.appendChild(this.buildFooter());
    
    const toast = document.createElement('div');
    toast.className = 'bg-toast';
    toast.id = 'bg-toast';
    panel.appendChild(toast);
    
    return panel;
  }
  
  buildHeader() {
    const header = document.createElement('div');
    header.className = 'bg-header';
    header.innerHTML = `<h2>ArtGrid Media</h2>`;
    
    const actions = document.createElement('div');
    actions.className = 'bg-header-actions';
    
    const rescanBtn = document.createElement('button');
    rescanBtn.className = 'bg-btn';
    rescanBtn.textContent = 'Rescan';
    rescanBtn.onclick = () => this.rescanCallback();
    
    const pinBtn = document.createElement('button');
    pinBtn.className = `bg-btn ${this.state.pinned ? 'active' : ''}`;
    pinBtn.textContent = this.state.pinned ? 'Pinned' : 'Pin UI';
    pinBtn.onclick = () => this.togglePin();
    
    actions.append(rescanBtn, pinBtn);
    header.appendChild(actions);
    
    return header;
  }

  buildFilterBar() {
    const bar = document.createElement('div');
    bar.className = 'bg-filterbar';

    const typeSelect = document.createElement('select');
    [['all', 'All media'], ['image', 'Images'], ['gif', 'GIFs'], ['video', 'Video']].forEach(([val, label]) => {
      typeSelect.add(new Option(label, val));
    });
    typeSelect.value = this.state.filters.mediaType;
    typeSelect.addEventListener('change', (e) => this.applyFilter('mediaType', (e.target as HTMLSelectElement).value));

    const sizeSelect = document.createElement('select');
    [['0','All sizes'], ['300','300px+'], ['600','600px+'], ['1200','1200px+']].forEach(([val, label]) => {
      sizeSelect.add(new Option(label, val));
    });
    sizeSelect.value = this.state.filters.minSize.toString();
    sizeSelect.addEventListener('change', (e) => this.applyFilter('minSize', Number((e.target as HTMLSelectElement).value)));

    const dedupeToggle = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.state.filters.hideDuplicates;
    checkbox.addEventListener('change', (e) => this.applyFilter('hideDuplicates', (e.target as HTMLInputElement).checked));
    dedupeToggle.append(checkbox, ' Hide duplicates');

    bar.append(typeSelect, sizeSelect, dedupeToggle);
    return bar;
  }

  applyFilter(key: keyof typeof this.state.filters, value: any) {
    (this.state.filters as any)[key] = value;
    this.render(); 
  }

  classifyMediaType(item: MediaEntry) {
    if (item.kind === 'video') return 'gif'; 
    if (/\.gif(\?|$)/i.test(item.bestSrc || '')) return 'gif';
    return 'image';
  }

  getFilteredItems() {
    return this.state.items.filter(item => {
      if (this.state.filters.mediaType !== 'all') {
        const itemType = this.classifyMediaType(item);
        if (itemType !== this.state.filters.mediaType) return false;
      }
      if (item.displaySize.w < this.state.filters.minSize) return false;
      if (this.state.filters.hideDuplicates && item.duplicateCount > 1 && item.isNonPrimaryDuplicate) return false;
      return true;
    });
  }

  buildGrid() {
    const grid = document.createElement('div');
    grid.className = 'bg-grid';
    const filtered = this.getFilteredItems();

    filtered.forEach(item => {
      if (item.kind === 'video') {
        grid.appendChild(this.buildVideoCell(item));
      } else {
        const cell = document.createElement('div');
        cell.className = `bg-cell ${this.state.selected.has(item.id) ? 'selected' : ''}`;
        
        const img = document.createElement('img');
        img.src = item.thumbSrc;
        img.loading = 'lazy';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.state.selected.has(item.id);
        checkbox.addEventListener('change', () => this.toggleSelect(item.id));

        if (item.duplicateCount > 1 && !item.isNonPrimaryDuplicate) {
          const badge = document.createElement('span');
          badge.className = 'bg-badge';
          badge.textContent = `×${item.duplicateCount}`;
          cell.appendChild(badge);
        }
        
        cell.append(checkbox, img);
        cell.addEventListener('click', (e) => {
          if (e.target !== checkbox) this.scrollToSource(item);
        });
        grid.appendChild(cell);
      }
    });
    
    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px 0; color: #9ca3af; font-size: 14px;">No media found matching filters.</div>`;
    }
    return grid;
  }

  buildVideoCell(item: MediaEntry) {
    const cell = document.createElement('div');
    cell.className = `bg-cell bg-cell-video ${this.state.selected.has(item.id) ? 'selected' : ''}`;
    if (item.unresolvable) cell.classList.add('bg-cell-disabled');
    
    const thumb = document.createElement('img');
    thumb.src = item.thumbSrc;
    thumb.loading = 'lazy';
    thumb.addEventListener('error', () => this.captureFrameFallback(item, thumb), { once: true });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.state.selected.has(item.id);
    if (item.unresolvable) checkbox.disabled = true;
    checkbox.addEventListener('change', () => this.toggleSelect(item.id));

    const badge = document.createElement('span');
    badge.className = 'bg-video-badge';
    badge.textContent = item.duration ? this.formatDuration(item.duration) : 'Video';
    
    cell.append(checkbox, thumb, badge);
    cell.addEventListener('click', (e) => {
      if (e.target !== checkbox) this.scrollToSource(item);
    });
    return cell;
  }

  formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  captureFrameFallback(item: MediaEntry, imgEl: HTMLImageElement) {
    const video = item.domRef.deref() as HTMLVideoElement;
    if (!video || video.readyState < 2) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      imgEl.src = canvas.toDataURL('image/jpeg', 0.6);
    } catch (e) {
      console.warn('Canvas taint on video frame capture', e);
    }
  }

  toggleSelect(id: string) {
    if (this.state.selected.has(id)) {
      this.state.selected.delete(id);
    } else {
      this.state.selected.add(id);
    }
    this.render();
  }

  selectAllFiltered() {
    const filtered = this.getFilteredItems();
    const allSelected = filtered.every(i => this.state.selected.has(i.id));
    
    if (allSelected) {
      filtered.forEach(i => this.state.selected.delete(i.id));
    } else {
      filtered.forEach(i => {
        if (!i.unresolvable) this.state.selected.add(i.id);
      });
    }
    this.render();
  }

  scrollToSource(item: MediaEntry) {
    const el = item.domRef.deref();
    if (el) { 
      el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
      
      // Flash highlight
      const originalOutline = el.style.outline;
      const originalTransition = el.style.transition;
      el.style.transition = 'outline 0.2s';
      el.style.outline = '4px solid #3b82f6';
      setTimeout(() => {
        el.style.outline = originalOutline;
        setTimeout(() => el.style.transition = originalTransition, 200);
      }, 1000);
    }
  }

  buildFooter() {
    const footer = document.createElement('div');
    footer.className = 'bg-footer';
    
    const count = document.createElement('span');
    count.textContent = `${this.state.selected.size} selected`;
    count.style.fontSize = '12px';
    count.style.color = '#9ca3af';

    const rightContainer = document.createElement('div');
    rightContainer.style.display = 'flex';
    rightContainer.style.gap = '8px';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'bg-btn';
    selectAllBtn.textContent = 'Select all';
    selectAllBtn.addEventListener('click', () => this.selectAllFiltered());

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'bg-download-btn';
    downloadBtn.textContent = 'Download';
    downloadBtn.disabled = this.state.selected.size === 0;
    downloadBtn.addEventListener('click', () => this.bulkDownload());

    rightContainer.append(selectAllBtn, downloadBtn);
    footer.append(count, rightContainer);
    return footer;
  }
  
  showToast(message: string) {
    const toast = this.shadow.getElementById('bg-toast');
    if (toast) {
      toast.textContent = message;
      toast.style.opacity = '1';
      setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }
  }

  async bulkDownload() {
    const items = this.state.items.filter(i => this.state.selected.has(i.id) && !i.unresolvable);
    
    if (items.length === 0) return;

    const videos = items.filter(i => i.kind === 'video');
    if (videos.length > 5) {
      if (!confirm(`${videos.length} videos selected — this may take a while and use significant bandwidth. Continue?`)) {
        return;
      }
    }

    const payload = items.map(i => ({
      url: i.bestSrc,
      filename: i.filename,
      kind: i.kind,
      sourcePage: location.href,
      metadata: { pinId: '' } // Add metadata payload here if needed by backend later
    }));

    // Pass message to background script to bypass CSP
    chrome.runtime.sendMessage(
      {
        type: 'BATCH_SAVE_IMAGE',
        payload: { items: payload }
      },
      (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          this.showToast('Failed to queue downloads');
        } else {
          this.showToast(`Queued ${items.length} for download`);
          this.state.selected.clear();
          this.render();
        }
      }
    );
  }

  updateItem(id: string, updates: Partial<MediaEntry>) {
    const item = this.state.items.find(i => i.id === id);
    if (item) {
      Object.assign(item, updates);
      this.render();
    }
  }

  mergeNewItems(fresh: MediaEntry[]) {
    const existingByFile = new Map(this.state.items.map(i => [i.filename || i.bestSrc, i]));
    
    const merged: MediaEntry[] = [];
    for (const item of fresh) {
      const key = item.filename || item.bestSrc;
      if (key && existingByFile.has(key)) {
        merged.push(existingByFile.get(key)!);
      } else {
        merged.push(item);
      }
    }
    
    this.state.items = merged;
    this.render();
  }
}

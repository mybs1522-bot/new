// Application State
let catalogData = {
  books: [],
  page: 1,
  limit: 36,
  total_books: 0,
  total_pages: 1,
  global_unlocked: false,
  folder: ''
};

let currentBook = null;
let currentZoom = 1.0;
let activePageIndex = 0;
let searchTimeout = null;

// Customer Authentication State & Multi-Tier Persistence (localStorage + 10-year Cookie)
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return '';
}

function setCookie(name, value, days = 3650) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
}

function deleteCookie(name) {
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
}

function saveCustomerSession(token, user) {
  if (!token) return;
  customerToken = token;
  if (user) {
    currentUser = typeof user === 'string' ? JSON.parse(user) : user;
  }
  try {
    localStorage.setItem('customer_token', token);
    if (currentUser) localStorage.setItem('customer_user', JSON.stringify(currentUser));
  } catch (e) {}
  setCookie('customer_token', token, 3650);
  if (currentUser) setCookie('customer_user', JSON.stringify(currentUser), 3650);
}

function clearCustomerSession() {
  customerToken = '';
  currentUser = null;
  try {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
  } catch (e) {}
  deleteCookie('customer_token');
  deleteCookie('customer_user');
}

let customerToken = '';
try {
  customerToken = localStorage.getItem('customer_token') || getCookie('customer_token') || '';
} catch (e) {}

let currentUser = null;
try {
  const cachedUser = localStorage.getItem('customer_user') || getCookie('customer_user');
  if (cachedUser) currentUser = JSON.parse(cachedUser);
} catch (e) {}

// If token exists, ensure currentUser exists so customer is never kicked out
if (customerToken && !currentUser) {
  currentUser = { email: 'Customer', has_unlocked_all: false };
}

let authMode = 'login'; // 'login' or 'signup'

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (customerToken) {
    headers['Authorization'] = `Bearer ${customerToken}`;
  }
  return headers;
}

// DOM Elements - Navigation & Global
const catalogSection = document.getElementById('catalogSection');
const readerSection = document.getElementById('readerSection');
const readerToolbar = document.getElementById('readerToolbar');
const backToLibraryBtn = document.getElementById('backToLibraryBtn');
const globalStatusBadge = document.getElementById('globalStatusBadge');
const topSubheader = document.getElementById('topSubheader');
const topUnlockAllBtn = document.getElementById('topUnlockAllBtn');
const bannerUnlockBtn = document.getElementById('bannerUnlockBtn');

// Auth DOM Elements
const authModal = document.getElementById('authModal');
const openAuthModalBtn = document.getElementById('openAuthModalBtn');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
const userProfilePill = document.getElementById('userProfilePill');
const userEmailLabel = document.getElementById('userEmailLabel');
const userAccessBadge = document.getElementById('userAccessBadge');
const userLogoutBtn = document.getElementById('userLogoutBtn');
const tabSignIn = document.getElementById('tabSignIn');
const tabSignUp = document.getElementById('tabSignUp');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authErrorMsg = document.getElementById('authErrorMsg');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSubmitText = document.getElementById('authSubmitText');
const authModalTitle = document.getElementById('authModalTitle');
const authModalSubtitle = document.getElementById('authModalSubtitle');
const authPreviewNotice = document.getElementById('authPreviewNotice');
let pendingPreviewBookId = null;


// Catalog Elements
const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const catalogCountText = document.getElementById('catalogCountText');
const currentCatalogPage = document.getElementById('currentCatalogPage');
const totalCatalogPages = document.getElementById('totalCatalogPages');
const prevCatalogPageBtn = document.getElementById('prevCatalogPageBtn');
const nextCatalogPageBtn = document.getElementById('nextCatalogPageBtn');

// Reader Elements
const thumbnailList = document.getElementById('thumbnailList');
const sidebarPageCount = document.getElementById('sidebarPageCount');
const sidebarLockedCount = document.getElementById('sidebarLockedCount');
const viewportContainer = document.getElementById('viewportContainer');
const documentPagesContainer = document.getElementById('documentPagesContainer');
const currentPageNum = document.getElementById('currentPageNum');
const totalPageNum = document.getElementById('totalPageNum');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomLevelText = document.getElementById('zoomLevelText');

// Download Dropdown
const downloadDropdownBtn = document.getElementById('downloadDropdownBtn');
const downloadMenu = document.getElementById('downloadMenu');
const downloadPreviewBtn = document.getElementById('downloadPreviewBtn');
const downloadFullBtn = document.getElementById('downloadFullBtn');
const downloadFullStatusText = document.getElementById('downloadFullStatusText');

// Paywall & On-Page Checkout Modal
const paywallModal = document.getElementById('paywallModal');
const closePaywallModalBtn = document.getElementById('closePaywallModalBtn');
const checkoutEmail = document.getElementById('checkoutEmail');
const cardBrandPill = document.getElementById('cardBrandPill');
const checkoutCardError = document.getElementById('checkoutCardError');
const payCardSubmitBtn = document.getElementById('payCardSubmitBtn');
const payCardSubmitText = document.getElementById('payCardSubmitText');
const paypalCheckoutBtn = document.getElementById('paypalCheckoutBtn');
const paypalButtonsContainer = document.getElementById('paypalButtonsContainer');
const checkoutCountdown = document.getElementById('checkoutCountdown');

// Toast
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const toastIcon = document.getElementById('toastIcon');

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showToast(message, type = 'info') {
  toastMsg.textContent = message;
  toast.classList.remove('hidden');
  
  if (type === 'success') {
    toastIcon.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>`;
  } else if (type === 'error') {
    toastIcon.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 text-rose-400"></i>`;
  } else {
    toastIcon.innerHTML = `<i data-lucide="info" class="w-4 h-4 text-pink-400"></i>`;
  }
  refreshIcons();

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// -------------------------------------------------------------
// Catalog Logic
// -------------------------------------------------------------
async function fetchCatalog(page = 1) {
  try {
    const search = searchInput.value.trim();
    const sort = sortSelect.value;
    const url = `/api/catalog?page=${page}&limit=${catalogData.limit}&search=${encodeURIComponent(search)}&sort=${sort}`;

    catalogCountText.textContent = 'Loading patterns...';
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load patterns catalog');

    catalogData = await res.json();
    updateGlobalLockBadge();
    renderCatalogGrid();
    updatePaginationUI();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function checkAuthStatus() {
  if (!customerToken) {
    if (openAuthModalBtn) openAuthModalBtn.classList.remove('hidden');
    if (userProfilePill) {
      userProfilePill.classList.add('hidden');
      userProfilePill.classList.remove('flex');
    }
    return;
  }

  // Render cached profile immediately so UI never flashes logged out
  if (currentUser) {
    if (openAuthModalBtn) openAuthModalBtn.classList.add('hidden');
    if (userProfilePill) {
      userProfilePill.classList.remove('hidden');
      userProfilePill.classList.add('flex');
    }
    if (userEmailLabel) userEmailLabel.textContent = currentUser.email;
    if (userAccessBadge) {
      if (currentUser.has_unlocked_all) {
        userAccessBadge.textContent = 'Unlocked ✓';
        userAccessBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-semibold';
        catalogData.global_unlocked = true;
        updateGlobalLockBadge();
      } else {
        userAccessBadge.textContent = 'Free';
        userAccessBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400';
      }
    }
  }

    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        saveCustomerSession(customerToken, data.user);
        if (openAuthModalBtn) openAuthModalBtn.classList.add('hidden');
        if (userProfilePill) {
          userProfilePill.classList.remove('hidden');
          userProfilePill.classList.add('flex');
        }
        if (userEmailLabel) userEmailLabel.textContent = currentUser.email;
        if (userAccessBadge) {
          if (currentUser.has_unlocked_all) {
            userAccessBadge.textContent = 'Unlocked ✓';
            userAccessBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-semibold';
            catalogData.global_unlocked = true;
            updateGlobalLockBadge();
          } else {
            userAccessBadge.textContent = 'Free';
            userAccessBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400';
          }
        }
      }
      // Never log out customer automatically! Session persists until customer clicks Logout.
    } catch (err) {
      console.warn('Auth check network warning (preserving customer session):', err);
    }
}

function updateGlobalLockBadge() {
  if (catalogData.global_unlocked) {
    if (globalStatusBadge) {
      globalStatusBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      globalStatusBadge.innerHTML = '✓ All Patterns Unlocked';
    }
    if (topUnlockAllBtn) topUnlockAllBtn.classList.add('hidden');
    if (bannerUnlockBtn) bannerUnlockBtn.classList.add('hidden');
  } else {
    if (globalStatusBadge) {
      globalStatusBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25';
      globalStatusBadge.innerHTML = 'Preview Mode';
    }
    if (topUnlockAllBtn) topUnlockAllBtn.classList.remove('hidden');
    if (bannerUnlockBtn) bannerUnlockBtn.classList.remove('hidden');
  }
}

function renderCatalogGrid() {
  booksGrid.innerHTML = '';
  catalogCountText.textContent = `Showing ${catalogData.books.length} of ${catalogData.total_books} patterns`;

  if (catalogData.books.length === 0) {
    booksGrid.innerHTML = `
      <div class="col-span-full py-16 text-center space-y-3">
        <i data-lucide="search-x" class="w-12 h-12 text-slate-600 mx-auto"></i>
        <h3 class="text-base font-bold text-slate-300">No patterns found</h3>
        <p class="text-xs text-slate-500">Try adjusting your search query</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  catalogData.books.forEach(book => {
    const card = document.createElement('div');
    card.className = 'premium-card group rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer';

    card.innerHTML = `
      <div class="flex flex-col h-full justify-between">
        <div class="book-thumbnail-a4 relative">
          <img
            src="${book.cover_url}"
            alt="${book.title}"
            loading="lazy"
            onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'283\\' fill=\\'%23121316\\'><rect width=\\'100%\\' height=\\'100%\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%238a8d95\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'12\\'>A4 Cover</text></svg>'"
          />
          <!-- Starred Badge if featured by admin -->
          ${book.is_starred ? 
            `<div class="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-zinc-950 shadow-sm">
              <i data-lucide="star" class="w-2.5 h-2.5 fill-zinc-950"></i> FEATURED
            </div>` : ''
          }
          <div class="absolute top-2 right-2 z-10">
            ${book.unlocked ? 
              `<span class="px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-500 text-white shadow-sm">UNLOCKED</span>` : 
              `<span class="px-2 py-0.5 rounded text-[9px] font-medium bg-black/80 backdrop-blur-md text-zinc-300 border border-white/10">PREVIEW</span>`
            }
          </div>
        </div>

        <!-- Book Title & Info -->
        <div class="mt-3 space-y-1">
          <h3 class="text-xs sm:text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-white transition-colors" title="${book.title}">
            ${book.title}
          </h3>
          <div class="flex items-center justify-between text-[11px] text-zinc-500">
            <span>Crochet Pattern</span>
            <span class="text-zinc-400 font-medium group-hover:text-zinc-200 transition-colors flex items-center gap-0.5">
              Read <i data-lucide="chevron-right" class="w-3 h-3"></i>
            </span>
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      if (!customerToken || !currentUser) {
        requireAuthForPreview(book.id);
        return;
      }
      openBookReader(book.id);
    });

    booksGrid.appendChild(card);
  });

  refreshIcons();
}

function updatePaginationUI() {
  currentCatalogPage.textContent = catalogData.page;
  totalCatalogPages.textContent = catalogData.total_pages;
  prevCatalogPageBtn.disabled = catalogData.page <= 1;
  nextCatalogPageBtn.disabled = catalogData.page >= catalogData.total_pages;
}

prevCatalogPageBtn.addEventListener('click', () => {
  if (catalogData.page > 1) fetchCatalog(catalogData.page - 1);
});

nextCatalogPageBtn.addEventListener('click', () => {
  if (catalogData.page < catalogData.total_pages) fetchCatalog(catalogData.page + 1);
});

// Search and Sort Listeners
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchCatalog(1);
  }, 300);
});

sortSelect.addEventListener('change', () => {
  fetchCatalog(1);
});

// -------------------------------------------------------------
// Reader Logic
// -------------------------------------------------------------
async function openBookReader(bookId) {
  if (!customerToken || !currentUser) {
    requireAuthForPreview(bookId);
    return;
  }
  try {
    showToast('Loading crochet pattern...', 'info');
    const url = `/api/catalog/${bookId}` + (customerToken ? `?token=${encodeURIComponent(customerToken)}` : '');
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.status === 401) {
      requireAuthForPreview(bookId);
      return;
    }
    if (!res.ok) throw new Error('Failed to load book details');
    
    currentBook = await res.json();
    activePageIndex = 0;


    // Switch views
    catalogSection.classList.add('hidden');
    readerSection.classList.remove('hidden');
    readerToolbar.classList.remove('hidden');
    readerToolbar.classList.add('flex');
    backToLibraryBtn.classList.remove('hidden');
    backToLibraryBtn.classList.add('flex');

    // Update Header
    topSubheader.textContent = currentBook.title;
    totalPageNum.textContent = currentBook.page_count;
    sidebarPageCount.textContent = currentBook.page_count;

    updateReaderDownloadUI();
    renderThumbnails();
    renderPages();
    updateNavigationState();
    refreshIcons();
    viewportContainer.scrollTop = 0;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateReaderDownloadUI() {
  if (currentBook.unlocked) {
    downloadFullBtn.classList.remove('opacity-60');
    downloadFullStatusText.textContent = 'High resolution vector & printable PDF';
  } else {
    downloadFullBtn.classList.add('opacity-60');
    downloadFullStatusText.textContent = 'Requires unlocking paywall';
  }
}

function renderThumbnails() {
  thumbnailList.innerHTML = '';
  const lockedCount = currentBook.unlocked ? 0 : Math.max(0, currentBook.page_count - 2);
  sidebarLockedCount.textContent = `Locked: ${lockedCount}`;

  currentBook.pages.forEach((page, idx) => {
    const thumbItem = document.createElement('div');
    thumbItem.className = `cursor-pointer rounded-xl border p-2 transition group flex flex-col gap-1.5 ${
      idx === activePageIndex 
        ? 'border-pink-500 bg-pink-500/10' 
        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
    }`;
    thumbItem.id = `thumb-page-${page.page_num}`;

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'relative w-full aspect-[1/1.4] rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center';

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    const thumbUrl = new URL(page.image_url, window.location.origin);
    thumbUrl.searchParams.set('dpi', '36');
    if (customerToken) thumbUrl.searchParams.set('token', customerToken);
    img.src = thumbUrl.toString();
    img.alt = `Page ${page.page_num}`;
    img.className = 'w-full h-full object-cover transition-opacity duration-300';
    img.onerror = () => {
      setTimeout(() => {
        if (img) img.src = thumbUrl.toString() + '&_r=' + Date.now();
      }, 1500);
    };
    imgWrapper.appendChild(img);

    if (page.is_blurred) {
      const lockOverlay = document.createElement('div');
      lockOverlay.className = 'absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center';
      lockOverlay.innerHTML = `<div class="p-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30"><i data-lucide="lock" class="w-3.5 h-3.5"></i></div>`;
      imgWrapper.appendChild(lockOverlay);
    }

    const meta = document.createElement('div');
    meta.className = 'flex items-center justify-between text-[11px]';
    meta.innerHTML = `
      <span class="font-medium text-slate-300">Page ${page.page_num}</span>
      <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded ${
        page.is_blurred ? 'text-rose-400 bg-rose-500/10' : 'text-pink-400 bg-pink-500/10'
      }">
        ${page.is_blurred ? 'LOCKED' : 'PREVIEW'}
      </span>
    `;

    thumbItem.appendChild(imgWrapper);
    thumbItem.appendChild(meta);

    thumbItem.addEventListener('click', () => {
      jumpToPage(idx);
    });

    thumbnailList.appendChild(thumbItem);
  });
}

function renderPages() {
  documentPagesContainer.innerHTML = '';

  currentBook.pages.forEach((page) => {
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'page-container relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900';
    pageWrapper.id = `view-page-${page.page_num}`;
    pageWrapper.style.transform = `scale(${currentZoom})`;
    pageWrapper.style.transformOrigin = 'top center';

    // Page Top Banner
    const pageBar = document.createElement('div');
    pageBar.className = 'px-4 py-2 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md flex items-center justify-between text-xs';
    
    if (page.is_blurred) {
      pageBar.innerHTML = `
        <div class="flex items-center gap-2 text-rose-400 font-semibold">
          <i data-lucide="lock" class="w-3.5 h-3.5"></i>
          <span>Page ${page.page_num} of ${currentBook.page_count} (Blurred Paywall)</span>
        </div>
        <button class="unlock-btn-inline px-2.5 py-1 rounded-md bg-pink-600 hover:bg-pink-500 text-white font-bold text-[11px] transition flex items-center gap-1">
          <i data-lucide="sparkles" class="w-3 h-3"></i> Unlock All Patterns
        </button>
      `;
    } else {
      pageBar.innerHTML = `
        <div class="flex items-center gap-2 text-emerald-400 font-semibold">
          <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
          <span>Page ${page.page_num} of ${currentBook.page_count} (Preview)</span>
        </div>
        <span class="text-[11px] text-slate-400">Crisp High-Res Vector</span>
      `;
    }
    pageWrapper.appendChild(pageBar);

    // Image display container
    const imgContainer = document.createElement('div');
    imgContainer.className = 'relative w-full aspect-[1/1.414] bg-slate-900 flex items-center justify-center';

    const pageImg = document.createElement('img');
    pageImg.loading = 'lazy';
    pageImg.decoding = 'async';
    const pUrl = new URL(page.image_url, window.location.origin);
    pUrl.searchParams.set('dpi', '144');
    if (customerToken) pUrl.searchParams.set('token', customerToken);
    pageImg.src = pUrl.toString();
    pageImg.alt = `Page ${page.page_num}`;
    pageImg.className = 'w-full h-full object-contain transition-opacity duration-300';
    pageImg.onerror = () => {
      setTimeout(() => {
        if (pageImg) pageImg.src = pUrl.toString() + '&_r=' + Date.now();
      }, 1500);
    };
    imgContainer.appendChild(pageImg);

    // If blurred, overlay the Paywall Card
    if (page.is_blurred) {
      const paywallCard = createPaywallOverlay(page.page_num);
      imgContainer.appendChild(paywallCard);
    }

    pageWrapper.appendChild(imgContainer);
    documentPagesContainer.appendChild(pageWrapper);
  });

  document.querySelectorAll('.unlock-btn-inline').forEach(btn => {
    btn.addEventListener('click', openPaywallModal);
  });
}

function createPaywallOverlay(pageNum) {
  const overlay = document.createElement('div');
  overlay.className = 'absolute inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6';

  overlay.innerHTML = `
    <div class="bg-[#121316] max-w-md w-full rounded-2xl border border-white/10 p-6 sm:p-8 text-center space-y-4 shadow-2xl relative">
      
      <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 mx-auto">
        <i data-lucide="lock" class="w-5 h-5"></i>
      </div>

      <div class="space-y-1">
        <div class="inline-block px-2.5 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 text-[10px] font-medium uppercase tracking-wider">
          Full Pattern Locked
        </div>
        <h3 class="text-lg font-semibold text-white tracking-tight">
          Unlock All 1,000+ Crochet Patterns
        </h3>
        <p class="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Access complete step-by-step stitch instructions, round counts, and printable diagrams for all 948+ patterns.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2 text-left bg-zinc-900/50 p-3 rounded-xl border border-white/[0.06] text-xs text-zinc-300">
        <div class="flex items-center gap-2">
          <i data-lucide="check" class="w-3.5 h-3.5 text-zinc-400"></i>
          <span>Instant unblur access</span>
        </div>
        <div class="flex items-center gap-2">
          <i data-lucide="check" class="w-3.5 h-3.5 text-zinc-400"></i>
          <span>Printable vector PDFs</span>
        </div>
        <div class="flex items-center gap-2">
          <i data-lucide="check" class="w-3.5 h-3.5 text-zinc-400"></i>
          <span>All 948 patterns</span>
        </div>
        <div class="flex items-center gap-2">
          <i data-lucide="check" class="w-3.5 h-3.5 text-zinc-400"></i>
          <span>One-time payment, lifetime updates</span>
        </div>
      </div>

      <div class="pt-1">
        <button class="paywall-cta-trigger w-full py-3 px-6 rounded-xl font-semibold text-xs sm:text-sm text-zinc-950 bg-white hover:bg-zinc-200 shadow-sm transition flex items-center justify-center gap-2">
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-zinc-700"></i>
          <span>Unlock Lifetime All-Access ($39)</span>
        </button>
      </div>

    </div>
  `;

  overlay.querySelector('.paywall-cta-trigger').addEventListener('click', openPaywallModal);

  return overlay;
}

function jumpToPage(index) {
  if (index < 0 || index >= currentBook.page_count) return;
  activePageIndex = index;
  currentPageNum.textContent = index + 1;

  currentBook.pages.forEach((p, idx) => {
    const thumb = document.getElementById(`thumb-page-${p.page_num}`);
    if (thumb) {
      if (idx === index) {
        thumb.className = 'cursor-pointer rounded-xl border p-2 transition group flex flex-col gap-1.5 border-pink-500 bg-pink-500/10 shadow-lg';
      } else {
        thumb.className = 'cursor-pointer rounded-xl border p-2 transition group flex flex-col gap-1.5 border-slate-800 hover:border-slate-700 bg-slate-900/40';
      }
    }
  });

  const targetPage = document.getElementById(`view-page-${index + 1}`);
  if (targetPage) {
    targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  updateNavigationState();
  refreshIcons();
}

function updateNavigationState() {
  prevPageBtn.disabled = activePageIndex <= 0;
  nextPageBtn.disabled = activePageIndex >= (currentBook ? currentBook.page_count - 1 : 0);
}

prevPageBtn.addEventListener('click', () => jumpToPage(activePageIndex - 1));
nextPageBtn.addEventListener('click', () => jumpToPage(activePageIndex + 1));

// Zoom
zoomInBtn.addEventListener('click', () => {
  currentZoom = Math.min(1.8, currentZoom + 0.15);
  zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
  document.querySelectorAll('.page-container').forEach(el => el.style.transform = `scale(${currentZoom})`);
});

zoomOutBtn.addEventListener('click', () => {
  currentZoom = Math.max(0.6, currentZoom - 0.15);
  zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
  document.querySelectorAll('.page-container').forEach(el => el.style.transform = `scale(${currentZoom})`);
});

// Back to library
backToLibraryBtn.addEventListener('click', () => {
  readerSection.classList.add('hidden');
  readerToolbar.classList.add('hidden');
  readerToolbar.classList.remove('flex');
  backToLibraryBtn.classList.add('hidden');
  backToLibraryBtn.classList.remove('flex');

  catalogSection.classList.remove('hidden');
  topSubheader.textContent = '1,000+ Crochet Patterns Collection';
  fetchCatalog(catalogData.page);
});

// -------------------------------------------------------------
// Unlock & Paywall Logic
// -------------------------------------------------------------
// -------------------------------------------------------------
// On-Page Card Checkout & PayPal Integration
// -------------------------------------------------------------

let stripe = null;
let stripeElements = null;
let cardNumberElement = null;
let cardExpiryElement = null;
let cardCvcElement = null;
let stripeMounted = false;
let paymentConfig = null;

// Countdown Timer: 01:37:30 urgency timer
let countdownSeconds = 5850;
try {
  const savedTimer = sessionStorage.getItem('crochet_checkout_timer');
  if (savedTimer) {
    const parsed = parseInt(savedTimer, 10);
    if (!isNaN(parsed) && parsed > 10) countdownSeconds = parsed;
  }
} catch (e) {}

function renderCountdown() {
  if (countdownSeconds > 0) {
    countdownSeconds--;
    try { sessionStorage.setItem('crochet_checkout_timer', countdownSeconds.toString()); } catch (e) {}
  }
  const h = Math.floor(countdownSeconds / 3600);
  const m = Math.floor((countdownSeconds % 3600) / 60);
  const s = countdownSeconds % 60;
  const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (checkoutCountdown) {
    checkoutCountdown.textContent = str;
  }
}
setInterval(renderCountdown, 1000);
renderCountdown();

async function initStripeElements() {
  if (stripeMounted) return;

  try {
    if (!paymentConfig) {
      const res = await fetch('/api/payments/config');
      paymentConfig = await res.json();
    }

    if (!paymentConfig.publishable_key || !window.Stripe) {
      console.warn("Stripe.js not available or publishable key missing.");
      return;
    }

    stripe = Stripe(paymentConfig.publishable_key);
    stripeElements = stripe.elements();

    const elementStyles = {
      base: {
        color: '#18181b',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '13px',
        fontWeight: '500',
        lineHeight: '20px',
        '::placeholder': {
          color: '#a1a1aa'
        }
      },
      invalid: {
        color: '#dc2626',
        iconColor: '#dc2626'
      }
    };

    const cardNumTarget = document.getElementById('stripe-card-number');
    const cardExpTarget = document.getElementById('stripe-card-expiry');
    const cardCvcTarget = document.getElementById('stripe-card-cvc');

    if (!cardNumTarget || !cardExpTarget || !cardCvcTarget) return;

    cardNumberElement = stripeElements.create('cardNumber', {
      style: elementStyles,
      showIcon: false,
      placeholder: '1234 1234 1234 1234'
    });
    cardNumberElement.mount('#stripe-card-number');

    cardExpiryElement = stripeElements.create('cardExpiry', {
      style: elementStyles,
      placeholder: 'MM / YY'
    });
    cardExpiryElement.mount('#stripe-card-expiry');

    cardCvcElement = stripeElements.create('cardCvc', {
      style: elementStyles,
      placeholder: 'CVC'
    });
    cardCvcElement.mount('#stripe-card-cvc');

    // Dynamic Card Brand Icon detection
    cardNumberElement.on('change', (event) => {
      if (event.error) {
        showCardError(event.error.message);
      } else {
        clearCardError();
      }

      if (cardBrandPill) {
        const brand = event.brand;
        if (brand === 'visa') {
          cardBrandPill.innerHTML = `<span class="px-1.5 py-0.5 rounded bg-blue-600 text-[10px] font-black text-white tracking-wider">VISA</span>`;
        } else if (brand === 'mastercard') {
          cardBrandPill.innerHTML = `<span class="px-1.5 py-0.5 rounded bg-amber-500 text-[10px] font-black text-white tracking-wider">MC</span>`;
        } else if (brand === 'amex') {
          cardBrandPill.innerHTML = `<span class="px-1.5 py-0.5 rounded bg-sky-500 text-[10px] font-black text-white tracking-wider">AMEX</span>`;
        } else if (brand === 'discover') {
          cardBrandPill.innerHTML = `<span class="px-1.5 py-0.5 rounded bg-orange-500 text-[10px] font-black text-white tracking-wider">DISC</span>`;
        } else {
          cardBrandPill.innerHTML = `<span class="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] font-bold text-zinc-600 border border-zinc-200">CARD</span>`;
        }
      }
    });

    stripeMounted = true;
  } catch (err) {
    console.error("Failed to initialize Stripe Elements:", err);
  }
}

function showCardError(msg) {
  if (checkoutCardError) {
    checkoutCardError.textContent = msg;
    checkoutCardError.classList.remove('hidden');
  }
}

function clearCardError() {
  if (checkoutCardError) {
    checkoutCardError.textContent = '';
    checkoutCardError.classList.add('hidden');
  }
}

function setCardLoading(loading) {
  if (!payCardSubmitBtn) return;
  payCardSubmitBtn.disabled = loading;
  if (loading) {
    payCardSubmitBtn.innerHTML = `
      <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1.5"></span>
      <span>Processing Payment...</span>
    `;
  } else {
    payCardSubmitBtn.innerHTML = `
      <i data-lucide="lock" class="w-3.5 h-3.5"></i>
      <span id="payCardSubmitText">Get Instant Access ($39)</span>
    `;
    refreshIcons();
  }
}

function openPaywallModal() {
  if (currentUser && currentUser.email && checkoutEmail) {
    checkoutEmail.value = currentUser.email;
  }
  clearCardError();
  paywallModal.classList.remove('hidden');
  initStripeElements();
  refreshIcons();
}

function closePaywallModal() {
  paywallModal.classList.add('hidden');
  clearCardError();
}

closePaywallModalBtn.addEventListener('click', closePaywallModal);
topUnlockAllBtn.addEventListener('click', openPaywallModal);
bannerUnlockBtn.addEventListener('click', openPaywallModal);

// On-page Stripe Card Submission
async function handleOnPageCardPayment() {
  const email = (checkoutEmail.value || '').trim();
  if (!email || !email.includes('@')) {
    showCardError('Please enter a valid email address.');
    checkoutEmail.focus();
    return;
  }

  if (!stripe || !cardNumberElement) {
    showCardError('Payment processor is loading. Please try again in a moment.');
    return;
  }

  clearCardError();
  setCardLoading(true);

  try {
    // 1. Create PaymentIntent on server
    const intentRes = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email: email })
    });
    const intentData = await intentRes.json();
    if (!intentRes.ok) {
      throw new Error(intentData.detail || 'Could not initiate payment.');
    }

    const clientSecret = intentData.client_secret;
    const paymentIntentId = intentData.payment_intent_id;

    // 2. Confirm card payment with Stripe.js directly on page
    const confirmResult = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardNumberElement,
        billing_details: {
          email: email
        }
      }
    });

    if (confirmResult.error) {
      throw new Error(confirmResult.error.message || 'Payment failed. Please check your card information.');
    }

    if (confirmResult.paymentIntent && confirmResult.paymentIntent.status === 'succeeded') {
      // 3. Confirm with backend to record order & unlock user
      const verifyRes = await fetch('/api/payments/confirm-intent', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          email: email
        })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.detail || 'Verification error after charge.');
      }

      if (verifyData.token) {
        saveCustomerSession(verifyData.token, verifyData.user);
      }

      catalogData.global_unlocked = true;
      updateGlobalLockBadge();
      await checkAuthStatus();

      closePaywallModal();

      if (window.confetti) {
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.5 }
        });
      }
      showToast('🎉 Payment verified! Lifetime All-Access has been unlocked.', 'success');

      if (currentBook) {
        await openBookReader(currentBook.id);
      } else {
        await fetchCatalog(catalogData.page);
      }
    }
  } catch (err) {
    showCardError(err.message);
  } finally {
    setCardLoading(false);
  }
}

if (payCardSubmitBtn) {
  payCardSubmitBtn.addEventListener('click', handleOnPageCardPayment);
}

// On-page PayPal Payment
async function handlePayPalCheckout() {
  const email = (checkoutEmail.value || '').trim() || (currentUser ? currentUser.email : '');
  
  if (!email || !email.includes('@')) {
    showCardError('Please enter your email above before continuing with PayPal.');
    checkoutEmail.focus();
    return;
  }

  clearCardError();
  paypalCheckoutBtn.disabled = true;
  paypalCheckoutBtn.innerHTML = `
    <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
    <span>Connecting to PayPal...</span>
  `;

  try {
    const res = await fetch('/api/payments/paypal-capture', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        email: email,
        order_id: 'PP-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'PayPal checkout failed');

    if (data.token) {
      saveCustomerSession(data.token, data.user);
    }

    catalogData.global_unlocked = true;
    updateGlobalLockBadge();
    await checkAuthStatus();

    closePaywallModal();

    if (window.confetti) {
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.5 }
      });
    }
    showToast('🎉 PayPal payment confirmed! Lifetime access unlocked.', 'success');

    if (currentBook) {
      await openBookReader(currentBook.id);
    } else {
      await fetchCatalog(catalogData.page);
    }
  } catch (err) {
    showCardError(err.message);
  } finally {
    paypalCheckoutBtn.disabled = false;
    paypalCheckoutBtn.innerHTML = `
      <svg class="h-4 fill-white inline-block" viewBox="0 0 100 26" xmlns="http://www.w3.org/2000/svg"><path d="M12.24 3.12h-8.1a.95.95 0 0 0-.94.81L.03 23.32a.63.63 0 0 0 .62.72h4.5a.95.95 0 0 0 .94-.81l.9-5.71a.95.95 0 0 1 .94-.81h2.7c5.23 0 8.35-2.53 9.14-7.5.35-2.22.02-3.95-.98-5.14-1.12-1.34-3.09-1.88-5.55-1.88zm.92 6.07c-.45 2.87-2.67 2.87-4.74 2.87h-1.3l.97-6.17c.04-.26.26-.45.52-.45h.8c1.37 0 2.65 0 3.29.74.39.46.54 1.18.46 2.01zM34.92 8.76h-4.48a.95.95 0 0 0-.94.81l-.19 1.18-.3-.44c-.95-1.39-3.08-1.86-5.28-1.86-4.94 0-9.15 3.74-9.98 9.04-.44 2.76.24 5.34 1.88 7.08 1.51 1.6 3.65 2.16 5.89 2.16 4.14 0 6.47-2.65 6.47-2.65l-.2 1.25a.63.63 0 0 0 .62.72h4.05a.95.95 0 0 0 .94-.81l2.4-15.28a.63.63 0 0 0-.62-.72zm-4.7 7.74c-.42 2.67-2.5 4.49-5.18 4.49-1.35 0-2.45-.44-3.02-1.22-.57-.77-.73-1.85-.46-3.03.42-2.64 2.52-4.48 5.17-4.48 1.34 0 2.43.45 3 1.22.58.77.74 1.85.49 3.02zM53.15 8.76h-4.43a.95.95 0 0 0-.9.64l-6.32 14.73-2.39-14.3a.95.95 0 0 0-.94-.81h-4.4a.63.63 0 0 0-.62.74l4.5 20.35-4.22 5.92a.63.63 0 0 0 .52 1h4.43a.95.95 0 0 0 .78-.41l14.28-20.73a.63.63 0 0 0-.52-.99z"/></svg>
    `;
    refreshIcons();
  }
}

if (paypalCheckoutBtn) {
  paypalCheckoutBtn.addEventListener('click', handlePayPalCheckout);
}


// Download menu
downloadDropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  downloadMenu.classList.toggle('hidden');
});

document.addEventListener('click', () => {
  downloadMenu.classList.add('hidden');
});

downloadPreviewBtn.addEventListener('click', () => {
  if (!currentBook) return;
  showToast('Generating Teaser PDF with blurred pages...', 'info');
  window.location.href = `/api/catalog/${currentBook.id}/download?mode=preview` + (customerToken ? `&token=${encodeURIComponent(customerToken)}` : '');
});

downloadFullBtn.addEventListener('click', () => {
  if (!currentBook) return;
  if (!currentBook.unlocked) {
    openPaywallModal();
    return;
  }
  showToast('Downloading Full Pattern PDF...', 'info');
  window.location.href = `/api/catalog/${currentBook.id}/download?mode=full` + (customerToken ? `&token=${encodeURIComponent(customerToken)}` : '');
});

// -------------------------------------------------------------
// Interactive Floating Crochet Icons Hero Section
// -------------------------------------------------------------
const crochetHeroSvgIcons = [
  // 1. Yarn Ball
  {
    id: 1, pos: 'top-[8%] left-[6%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9" /><path d="M5.5 8C8.5 6.5 14.5 7 18 10.5" stroke-linecap="round"/><path d="M4 12C7.5 11 15 11.5 19 14.5" stroke-linecap="round"/><path d="M6 16C9 15.5 14.5 16 17.5 18" stroke-linecap="round"/><path d="M12 3C11 7 11.5 16 13 21" stroke-linecap="round"/><path d="M18 19C19 21 21 21.5 22 20.5" stroke-linecap="round"/></svg>`
  },
  // 2. Crochet Hook
  {
    id: 2, pos: 'top-[12%] right-[8%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><path d="M4 20L13.5 10.5" stroke-width="2.5" stroke-linecap="round"/><path d="M13.5 10.5L19 5C19.5 4.5 20.5 4 21 4.5C21.5 5 21 6 20.5 6.5L18.5 8.5C18 9 17 9 16.5 8.5" stroke-linecap="round"/></svg>`
  },
  // 3. Granny Square
  {
    id: 3, pos: 'bottom-[12%] left-[8%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3" /><rect x="7" y="7" width="10" height="10" rx="1.5" /><rect x="10.5" y="10.5" width="3" height="3" fill="currentColor" fill-opacity="0.3"/></svg>`
  },
  // 4. Amigurumi Bear
  {
    id: 4, pos: 'bottom-[12%] right-[10%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="13" r="8" /><circle cx="9.5" cy="11.5" r="1" fill="currentColor"/><circle cx="14.5" cy="11.5" r="1" fill="currentColor"/><ellipse cx="12" cy="15" rx="2.5" ry="1.8" /><path d="M11 14.5C11.5 15 12.5 15 13 14.5" stroke-linecap="round"/></svg>`
  },
  // 5. Crochet Heart
  {
    id: 5, pos: 'top-[4%] left-[26%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><path d="M12 20.5S3 14.5 3 8.5A5.5 5.5 0 0 1 12 5.09A5.5 5.5 0 0 1 21 8.5C21 14.5 12 20.5 12 20.5Z" stroke-linejoin="round"/></svg>`
  },
  // 6. Vintage Stork Scissors
  {
    id: 6, pos: 'top-[4%] right-[26%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="18" r="3" /><circle cx="12" cy="18" r="3" /><path d="M8 15L15 4L16 5L10 16" stroke-linecap="round"/><path d="M15 4L20 8" stroke-linecap="round"/></svg>`
  },
  // 7. Yarn Skein
  {
    id: 7, pos: 'bottom-[14%] left-[22%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="12" rx="9" ry="5.5" /><rect x="9.5" y="6.5" width="5" height="11" rx="1" fill="currentColor" fill-opacity="0.2"/></svg>`
  },
  // 8. Sunflower Applique
  {
    id: 8, pos: 'top-[44%] left-[4%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4" /><circle cx="12" cy="5" r="2.2" /><circle cx="12" cy="19" r="2.2" /><circle cx="5" cy="12" r="2.2" /><circle cx="19" cy="12" r="2.2" /></svg>`
  },
  // 9. Stitch Marker
  {
    id: 9, pos: 'top-[74%] right-[22%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><path d="M12 4C8.5 4 6 7 6 11C6 16 11 20 12 21C13 20 18 16 18 11C18 7 15.5 4 12 4Z" /><circle cx="12" cy="10" r="2" fill="currentColor" fill-opacity="0.3"/></svg>`
  },
  // 10. Crochet Pom-pom Beanie
  {
    id: 10, pos: 'bottom-[6%] left-[48%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="4" r="2.2" /><path d="M5 17C5 10 7.5 6 12 6C16.5 6 19 10 19 17" /><rect x="4" y="17" width="16" height="4" rx="2" /></svg>`
  },
  // 11. Amigurumi Frog
  {
    id: 11, pos: 'top-[50%] right-[5%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="14" rx="8" ry="6" /><circle cx="7" cy="8" r="2.5" /><circle cx="17" cy="8" r="2.5" /><path d="M8 15C10 17 14 17 16 15" stroke-linecap="round"/></svg>`
  },
  // 12. Tapestry Needle
  {
    id: 12, pos: 'top-[62%] left-[14%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><path d="M3 21L19 5" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="19" cy="5" rx="1.5" ry="3" transform="rotate(-45 19 5)" /></svg>`
  },
  // 13. Baby Bootie
  {
    id: 13, pos: 'top-[6%] left-[50%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><path d="M6 5H11V11C11 11 16 11 18 13C20 15 20 18 18 19C16 20 6 20 5 19C4 18 4 14 6 12V5Z" stroke-linejoin="round"/></svg>`
  },
  // 14. Magic Ring Loop
  {
    id: 14, pos: 'bottom-[10%] right-[38%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="7" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.2"/></svg>`
  },
  // 15. Measuring Tape
  {
    id: 15, pos: 'top-[28%] right-[16%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="12" r="6" /><path d="M10 18H20C21 18 22 17 22 16V14C22 13 21 12 20 12H16" /></svg>`
  },
  // 16. Market Mesh Bag
  {
    id: 16, pos: 'top-[68%] left-[28%]',
    svg: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6 md:w-7 md:h-7 text-zinc-400" stroke="currentColor" stroke-width="1.6"><path d="M8 8V5C8 3.5 10 3 12 3C14 3 16 3.5 16 5V8" stroke-linecap="round"/><path d="M5 8H19L18 20C18 21 17 22 16 22H8C7 22 6 21 6 20L5 8Z" /><path d="M8 12L16 16M16 12L8 16" stroke-linecap="round"/></svg>`
  }
];

function initFloatingCrochetHero() {
  const container = document.getElementById('floatingIconsContainer');
  const heroSection = document.getElementById('floatingHeroSection');
  if (!container || !heroSection) return;

  container.innerHTML = '';
  const iconElements = [];

  crochetHeroSvgIcons.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = `floating-crochet-icon absolute ${item.pos}`;

    const inner = document.createElement('div');
    inner.className = 'floating-crochet-inner w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 p-2 md:p-3';
    inner.style.animationDelay = `${(index * 0.4).toFixed(1)}s`;
    inner.innerHTML = item.svg;

    wrapper.appendChild(inner);
    container.appendChild(wrapper);

    iconElements.push({
      el: wrapper,
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0
    });
  });

  // Track mouse coordinates over the hero section
  let mouseClientX = -9999;
  let mouseClientY = -9999;

  heroSection.addEventListener('mousemove', (e) => {
    mouseClientX = e.clientX;
    mouseClientY = e.clientY;
  });

  heroSection.addEventListener('mouseleave', () => {
    mouseClientX = -9999;
    mouseClientY = -9999;
  });

  // Physics loop (spring repulsion)
  function updatePhysics() {
    iconElements.forEach(item => {
      if (mouseClientX > -9000) {
        const rect = item.el.getBoundingClientRect();
        const iconCenterX = rect.left + rect.width / 2;
        const iconCenterY = rect.top + rect.height / 2;

        const dx = mouseClientX - iconCenterX;
        const dy = mouseClientY - iconCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Repel when cursor is within 150px
        if (distance < 150) {
          const angle = Math.atan2(dy, dx);
          const force = (1 - distance / 150) * 55;
          item.targetX = -Math.cos(angle) * force;
          item.targetY = -Math.sin(angle) * force;
        } else {
          item.targetX = 0;
          item.targetY = 0;
        }
      } else {
        item.targetX = 0;
        item.targetY = 0;
      }

      // Smooth spring lerp
      item.currentX += (item.targetX - item.currentX) * 0.14;
      item.currentY += (item.targetY - item.currentY) * 0.14;

      item.el.style.transform = `translate3d(${item.currentX.toFixed(2)}px, ${item.currentY.toFixed(2)}px, 0)`;
    });

    requestAnimationFrame(updatePhysics);
  }

  requestAnimationFrame(updatePhysics);
}

// Auth Modal & Preview Signup Gate Handlers
function openAuthModal(mode = 'signup', forPreview = false) {
  authMode = mode;
  if (authErrorMsg) authErrorMsg.classList.add('hidden');
  if (authModal) authModal.classList.remove('hidden');

  if (forPreview) {
    if (authPreviewNotice) authPreviewNotice.classList.remove('hidden');
    if (authModalTitle) authModalTitle.textContent = mode === 'signup' ? 'Create Free Account' : 'Sign In to Pattern Archive';
    if (authModalSubtitle) authModalSubtitle.textContent = '1,000+ Crochet Patterns';
    if (authSubmitText) authSubmitText.textContent = mode === 'signup' ? 'Sign Up & View Pattern' : 'Sign In & View Pattern';
  } else {
    if (authPreviewNotice) authPreviewNotice.classList.add('hidden');
    if (authModalTitle) authModalTitle.textContent = mode === 'signup' ? 'Create Customer Account' : 'Welcome to Pattern Archive';
    if (authModalSubtitle) authModalSubtitle.textContent = '1,000+ Crochet Patterns';
    if (authSubmitText) authSubmitText.textContent = mode === 'signup' ? 'Create Account' : 'Sign In';
  }

  if (mode === 'signup') {
    if (tabSignUp) tabSignUp.className = 'flex-1 py-1.5 rounded-md font-semibold bg-white text-zinc-950 transition';
    if (tabSignIn) tabSignIn.className = 'flex-1 py-1.5 rounded-md font-medium text-zinc-400 hover:text-white transition';
  } else {
    if (tabSignIn) tabSignIn.className = 'flex-1 py-1.5 rounded-md font-semibold bg-white text-zinc-950 transition';
    if (tabSignUp) tabSignUp.className = 'flex-1 py-1.5 rounded-md font-medium text-zinc-400 hover:text-white transition';
  }

  refreshIcons();
}

function requireAuthForPreview(bookId) {
  pendingPreviewBookId = bookId;
  openAuthModal('signup', true);
}

if (openAuthModalBtn) {
  openAuthModalBtn.addEventListener('click', () => {
    pendingPreviewBookId = null;
    openAuthModal('login', false);
  });
}

if (closeAuthModalBtn) {
  closeAuthModalBtn.addEventListener('click', () => {
    authModal.classList.add('hidden');
    pendingPreviewBookId = null;
  });
}

if (tabSignIn && tabSignUp) {
  tabSignIn.addEventListener('click', () => {
    openAuthModal('login', !!pendingPreviewBookId);
  });

  tabSignUp.addEventListener('click', () => {
    openAuthModal('signup', !!pendingPreviewBookId);
  });
}

if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authErrorMsg.classList.add('hidden');
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      saveCustomerSession(data.token, data.user);
      authModal.classList.add('hidden');

      showToast(authMode === 'signup' ? '🎉 Welcome! Your account is now active.' : `Welcome back, ${currentUser.email}!`, 'success');
      await checkAuthStatus();

      // If customer was opening a preview, open that book immediately!
      if (pendingPreviewBookId) {
        const targetBookId = pendingPreviewBookId;
        pendingPreviewBookId = null;
        await openBookReader(targetBookId);
      } else {
        await fetchCatalog(catalogData.page);
      }
    } catch (err) {
      authErrorMsg.textContent = err.message;
      authErrorMsg.classList.remove('hidden');
    }
  });
}

if (userLogoutBtn) {
  userLogoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
    } catch (e) {}
    clearCustomerSession();
    showToast('Signed out successfully.', 'info');
    checkAuthStatus();
    fetchCatalog(catalogData.page);
  });
}

async function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const isSuccess = params.get('success');
  const isCanceled = params.get('canceled');

  if (sessionId && isSuccess === 'true') {
    showToast('Verifying Stripe payment...', 'info');
    try {
      const res = await fetch(`/api/payments/verify-session?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (data.paid) {
        if (data.token) {
          saveCustomerSession(data.token, data.user);
        }
        catalogData.global_unlocked = true;
        updateGlobalLockBadge();
        await checkAuthStatus();

        if (window.confetti) {
          confetti({
            particleCount: 160,
            spread: 90,
            origin: { y: 0.5 }
          });
        }
        showToast('🎉 Payment verified! Lifetime All-Access has been unlocked.', 'success');

        // Clean query parameters from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        await fetchCatalog(1);
      } else {
        showToast('Payment verification pending or incomplete.', 'error');
      }
    } catch (e) {
      showToast('Error verifying payment: ' + e.message, 'error');
    }
  } else if (isCanceled === 'true') {
    showToast('Stripe checkout was canceled. You can complete your order anytime.', 'info');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Initial Load
(async () => {
  await handlePaymentReturn();
  await checkAuthStatus();
  await fetchCatalog(1);
  initFloatingCrochetHero();
})();



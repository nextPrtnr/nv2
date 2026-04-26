/* ============================================================
   nextECA — Main Application
   Pure vanilla JS SPA with hash-based routing
   Data-driven: reads from /data/opportunities.json
   ============================================================ */

'use strict';

// ─── STATE ───────────────────────────────────────────────────────────────────
const State = {
  opps: [],
  partners: { trustedBy: [], mediaPartners: [], communityPartners: [] },
  saved: JSON.parse(localStorage.getItem('nexteca_saved') || '[]'),
  search: '',
  category: 'all',
  mode: [],
  level: '',
  sort: 'deadline',
  view: 'list',
  aiMessages: [],
  aiLoading: false,
  page: 'home',
  detailId: null,
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function daysLeft(deadlineStr) {
  const now = new Date(); now.setHours(0,0,0,0);
  const dl  = new Date(deadlineStr); dl.setHours(0,0,0,0);
  return Math.round((dl - now) / 86400000);
}
function deadlineClass(d) {
  if (d <= 0)  return 'deadline-urgent';
  if (d <= 10) return 'deadline-urgent';
  if (d <= 30) return 'deadline-soon';
  return 'deadline-safe';
}
function deadlineLabel(d) {
  if (d < 0)  return 'Deadline passed';
  if (d === 0) return 'Closes today!';
  if (d === 1) return '1 day left';
  return `${d} days left`;
}
function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function badgeClass(cat) {
  const map = {
    'Hackathon':'badge-hackathon','Scholarship':'badge-scholarship',
    'Competition':'badge-competition','Fellowship':'badge-fellowship',
    'Research':'badge-research','Olympiad':'badge-olympiad',
    'Exchange':'badge-exchange','Conference':'badge-conference'
  };
  return map[cat] || 'badge-hackathon';
}
function esc(str) {
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}
function saveSaved() {
  localStorage.setItem('nexteca_saved', JSON.stringify(State.saved));
}
function toggleSaved(id) {
  if (State.saved.includes(id)) {
    State.saved = State.saved.filter(x => x !== id);
    toast('Removed from saved');
  } else {
    State.saved.push(id);
    toast('Saved! View in Saved tab', 'success');
  }
  saveSaved();
  // Update bookmark buttons without full re-render
  document.querySelectorAll(`.bookmark-btn[data-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('saved', State.saved.includes(id));
    btn.title = State.saved.includes(id) ? 'Unsave' : 'Save';
  });
  document.querySelectorAll(`.detail-save-btn[data-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('saved', State.saved.includes(id));
    btn.innerHTML = State.saved.includes(id) ? '🔖 Saved' : '🔖 Save for Later';
  });
  // Update nav badge
  renderNavBadge();
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast${type ? ' '+type : ''}`;
  el.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ'}</span> ${esc(msg)}`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2800);
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────
function navigate(page, params = {}) {
  State.page = page;
  State.detailId = params.id || null;
  if (params.category) State.category = params.category;
  if (params.search !== undefined) State.search = params.search;

  // Update hash for shareable URLs
  let hash = '#/' + page;
  if (page === 'detail' && params.id) hash += '/' + params.id;
  if (page === 'opportunities' && params.category) hash += '?cat=' + params.category;
  history.pushState({ page, params }, '', hash);

  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeDropdown();
}

function parseHash() {
  const hash = location.hash.replace('#/', '');
  if (!hash || hash === '/') return { page: 'home' };
  const [path, query] = hash.split('?');
  const parts = path.split('/');
  const page = parts[0] || 'home';
  const params = {};
  if (page === 'detail' && parts[1]) params.id = parts[1];
  if (query) {
    query.split('&').forEach(p => {
      const [k, v] = p.split('=');
      params[k] = v;
    });
  }
  return { page, params };
}

window.addEventListener('popstate', () => {
  const { page, params } = parseHash();
  State.page = page;
  State.detailId = params?.id || null;
  if (params?.cat) State.category = params.cat;
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── DATA LOADING ─────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [oppsRes, partnersRes] = await Promise.all([
      fetch('./data/opportunities.json'),
      fetch('./data/partners.json'),
    ]);
    State.opps = await oppsRes.json();
    State.partners = await partnersRes.json();
  } catch (e) {
    console.warn('Could not load data files, using empty state', e);
    State.opps = [];
    State.partners = { trustedBy: [], mediaPartners: [], communityPartners: [] };
  }
}

// ─── NAVIGATION RENDER ────────────────────────────────────────────────────────
const NAV_CATEGORIES = [
  { cat:'Hackathon',   icon:'⌨️', bg:'#E9F2FF', label:'Hackathons',      sub:'Code & build challenges'    },
  { cat:'Scholarship', icon:'🎓', bg:'#E3FCEF', label:'Scholarships',    sub:'Fully funded study abroad'   },
  { cat:'Competition', icon:'🏆', bg:'#FFEBE6', label:'Competitions',    sub:'Win prizes worldwide'        },
  { cat:'Fellowship',  icon:'🌍', bg:'#FFF0B3', label:'Fellowships',     sub:'Leadership programs'         },
  { cat:'Research',    icon:'🔬', bg:'#EAE6FF', label:'Research Grants', sub:'Academic funding'            },
  { cat:'Olympiad',    icon:'🧮', bg:'#FFECF8', label:'Olympiads',       sub:'Science & math olympiads'   },
  { cat:'Exchange',    icon:'✈️', bg:'#E6FCFF', label:'Exchange Programs',sub:'Study abroad programs'      },
  { cat:'Conference',  icon:'🎤', bg:'#F3F0FF', label:'Conferences',     sub:'Represent your ideas'        },
];

function renderNav() {
  const nav = document.getElementById('nav');
  const savedCount = State.saved.length;
  nav.innerHTML = `
    <div class="nav-inner">
      <button class="nav-logo" onclick="navigate('home')">
        <div class="nav-logo-mark">N</div>
        <span class="nav-logo-text">next<span>ECA</span></span>
      </button>

      <nav class="nav-links" id="nav-links">
        <button class="nav-link ${State.page==='opportunities'?'active':''}"
          id="opps-trigger"
          aria-expanded="false"
          onclick="toggleDropdown(event)">
          Opportunities <span class="nav-chevron">▾</span>
        </button>
        <button class="nav-link ${State.page==='about'?'active':''}"
          onclick="navigate('about')">About</button>
        <button class="nav-link ${State.page==='submit'?'active':''}"
          onclick="navigate('submit')">Submit Opportunity</button>
        <button class="nav-link ${State.page==='saved'?'active':''}"
          onclick="navigate('saved')">
          Saved${savedCount > 0 ? `<span class="nav-badge">${savedCount}</span>` : ''}
        </button>
        <button class="nav-link ${State.page==='partners'?'active':''}"
          onclick="navigate('partners')">Partners</button>
      </nav>

      <div class="nav-right">
        <button class="btn btn-ghost btn-sm" onclick="showComingSoon()">Log in</button>
        <button class="btn btn-primary btn-sm" onclick="navigate('submit')">Submit Opportunity</button>
      </div>

      <button class="nav-hamburger" id="hamburger" onclick="toggleMobileNav()" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>

    <!-- Mega Dropdown -->
    <div class="nav-dropdown" id="nav-dropdown">
      <div class="nav-dropdown-grid">
        ${NAV_CATEGORIES.map(c => `
          <button class="dd-item" onclick="navigate('opportunities',{category:'${c.cat}'})">
            <div class="dd-icon" style="background:${c.bg}">${c.icon}</div>
            <div>
              <div class="dd-label">${c.label}</div>
              <div class="dd-sub">${c.sub}</div>
            </div>
          </button>
        `).join('')}
      </div>
      <div class="nav-dd-footer">
        <span>Browse all ${State.opps.length}+ opportunities</span>
        <a onclick="navigate('opportunities')" style="cursor:pointer">View all →</a>
      </div>
    </div>
  `;
}

function renderNavBadge() {
  const savedBtns = document.querySelectorAll('.saved-nav-count');
  savedBtns.forEach(el => el.textContent = State.saved.length);
}

let dropdownOpen = false;
function toggleDropdown(e) {
  e.stopPropagation();
  dropdownOpen = !dropdownOpen;
  const dd = document.getElementById('nav-dropdown');
  const trigger = document.getElementById('opps-trigger');
  if (dd) dd.classList.toggle('is-open', dropdownOpen);
  if (trigger) trigger.setAttribute('aria-expanded', dropdownOpen);
}
function closeDropdown() {
  dropdownOpen = false;
  const dd = document.getElementById('nav-dropdown');
  const trigger = document.getElementById('opps-trigger');
  if (dd) dd.classList.remove('is-open');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', (e) => {
  if (dropdownOpen && !e.target.closest('#nav-dropdown') && !e.target.closest('#opps-trigger')) {
    closeDropdown();
  }
});

let mobileNavOpen = false;
function toggleMobileNav() {
  mobileNavOpen = !mobileNavOpen;
  const links = document.getElementById('nav-links');
  if (links) {
    links.style.display = mobileNavOpen ? 'flex' : '';
    links.style.flexDirection = mobileNavOpen ? 'column' : '';
    links.style.position = mobileNavOpen ? 'absolute' : '';
    links.style.top = mobileNavOpen ? 'var(--nav-h)' : '';
    links.style.left = '0'; links.style.right = '0';
    links.style.background = mobileNavOpen ? 'var(--surface)' : '';
    links.style.borderBottom = mobileNavOpen ? '1px solid var(--border)' : '';
    links.style.padding = mobileNavOpen ? '8px 16px 16px' : '';
    links.style.zIndex = mobileNavOpen ? '400' : '';
    links.style.boxShadow = mobileNavOpen ? 'var(--shadow-lg)' : '';
  }
}

// ─── CATEGORY TAB STRIP ───────────────────────────────────────────────────────
function catCounts() {
  const counts = { all: State.opps.length };
  State.opps.forEach(o => { counts[o.category] = (counts[o.category] || 0) + 1; });
  return counts;
}

function renderCatStrip() {
  const counts = catCounts();
  const cats = [
    { key:'all', label:'All', icon:'⚡' },
    ...NAV_CATEGORIES.map(c => ({ key:c.cat, label:c.label, icon:c.icon }))
  ];
  return `
    <div class="cat-strip">
      <div class="cat-strip-inner">
        ${cats.map(c => `
          <button class="cat-tab ${State.category===c.key?'active':''}"
            onclick="setCategory('${c.key}')">
            ${c.icon} ${c.label}
            <span class="count">${counts[c.key]||0}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function setCategory(cat) {
  State.category = cat;
  renderOpportunitiesContent();
}

// ─── OPPORTUNITY CARD ─────────────────────────────────────────────────────────
function renderOppCard(opp) {
  const dl = daysLeft(opp.deadline);
  const saved = State.saved.includes(opp.id);
  return `
    <div class="opp-card${opp.featured?' featured-card':''}" onclick="navigate('detail',{id:'${opp.id}'})">
      <div class="opp-logo">${esc(opp.logo)}</div>
      <div class="opp-body">
        <div class="opp-top">
          <span class="badge ${badgeClass(opp.category)}">${esc(opp.category)}</span>
          ${opp.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
        </div>
        <div class="opp-title">${esc(opp.title)}</div>
        <div class="opp-org">${esc(opp.org)}</div>
        <div class="opp-tags">
          ${opp.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}
        </div>
        <div class="opp-meta">
          <span class="opp-meta-item">📍 ${esc(opp.location)}</span>
          <span class="opp-meta-item">🏅 ${esc(opp.prize)}</span>
          <span class="opp-meta-item">🗓 ${formatDate(opp.deadline)}</span>
        </div>
      </div>
      <div class="opp-right">
        <span class="deadline-badge ${deadlineClass(dl)}">${deadlineLabel(dl)}</span>
        <div class="opp-actions">
          <button class="bookmark-btn${saved?' saved':''}" data-id="${opp.id}"
            title="${saved?'Unsave':'Save'}"
            onclick="event.stopPropagation();toggleSaved('${opp.id}')">🔖</button>
          <button class="view-btn" onclick="event.stopPropagation();navigate('detail',{id:'${opp.id}'})">View Details</button>
        </div>
      </div>
    </div>
  `;
}

function renderOppGridCard(opp) {
  const dl = daysLeft(opp.deadline);
  return `
    <div class="opp-grid-card" onclick="navigate('detail',{id:'${opp.id}'})">
      <div class="grid-card-logo">${esc(opp.logo)}</div>
      <span class="badge ${badgeClass(opp.category)}">${esc(opp.category)}</span>
      <div class="grid-card-title" style="margin-top:8px">${esc(opp.title)}</div>
      <div class="grid-card-org">${esc(opp.org)}</div>
      <div class="grid-card-footer">
        <span class="deadline-badge ${deadlineClass(dl)}">${deadlineLabel(dl)}</span>
        <button class="view-btn btn-sm" onclick="event.stopPropagation();navigate('detail',{id:'${opp.id}'})">View →</button>
      </div>
    </div>
  `;
}

// ─── FILTER LOGIC ─────────────────────────────────────────────────────────────
function getFiltered() {
  let list = [...State.opps];
  if (State.category !== 'all') list = list.filter(o => o.category === State.category);
  if (State.search) {
    const q = State.search.toLowerCase();
    list = list.filter(o =>
      o.title.toLowerCase().includes(q) ||
      o.org.toLowerCase().includes(q) ||
      o.tags.some(t => t.toLowerCase().includes(q)) ||
      o.location.toLowerCase().includes(q)
    );
  }
  if (State.mode.length) list = list.filter(o => State.mode.includes(o.mode));
  if (State.level) list = list.filter(o => o.level === State.level);
  if (State.sort === 'deadline') list.sort((a,b) => daysLeft(a.deadline) - daysLeft(b.deadline));
  if (State.sort === 'featured') list.sort((a,b) => (b.featured?1:0) - (a.featured?1:0));
  return list;
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
State.aiMessages = [
  { role:'bot', text:'👋 Hi! Tell me your interests or what you\'re looking for, and I\'ll suggest the best opportunities for you.' }
];

async function sendAiMessage() {
  const input = document.getElementById('ai-input');
  if (!input || !input.value.trim()) return;
  const userMsg = input.value.trim();
  input.value = '';

  State.aiMessages.push({ role:'user', text:userMsg });
  State.aiLoading = true;
  renderAiMessages();

  const systemPrompt = `You are nextECA's AI assistant — a friendly guide helping students in Bangladesh find opportunities. nextECA lists competitions, scholarships, hackathons, fellowships, research grants, and olympiads.

Current opportunities:
${State.opps.map(o => `• ${o.title} (${o.category}) by ${o.org} | ${o.location} | deadline in ${daysLeft(o.deadline)} days | prize: ${o.prize} | tags: ${o.tags.join(', ')}`).join('\n')}

When the student describes their interests, suggest 2-3 specific opportunities from the list with bold names using **name**. Be warm, encouraging, and concise. If the deadline is very close, mention it with urgency.`;

  const history = State.aiMessages
    .filter(m => m.role !== 'bot' || State.aiMessages.indexOf(m) === 0)
    .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: history
      })
    });
    const data = await response.json();
    const text = data.content?.map(c=>c.text||'').join('') || 'Sorry, I couldn\'t process that. Please try again.';
    State.aiMessages.push({ role:'bot', text });
  } catch(e) {
    State.aiMessages.push({ role:'bot', text:'⚠️ AI assistant is temporarily unavailable. Browse opportunities using the filters above!' });
  }
  State.aiLoading = false;
  renderAiMessages();
}

function renderAiMessages() {
  const container = document.getElementById('ai-messages');
  if (!container) return;

  container.innerHTML = State.aiMessages.map(m => `
    <div class="ai-msg ${m.role}">
      ${m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
    </div>
  `).join('');

  if (State.aiLoading) {
    container.innerHTML += `<div class="ai-typing"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>`;
  }
  container.scrollTop = container.scrollHeight;
}

function aiKeydown(e) { if (e.key === 'Enter') sendAiMessage(); }

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function renderSidebar() {
  return `
    <aside class="sidebar" style="position:sticky;top:calc(var(--nav-h) + 16px)">
      <!-- AI Panel -->
      <div class="ai-panel">
        <div class="ai-panel-head">
          <div class="ai-panel-badge">✨ AI-Powered</div>
          <h3>Smart Recommendations</h3>
          <p>Tell me your interests and I'll find your perfect opportunity.</p>
        </div>
        <div class="ai-panel-body">
          <div class="ai-messages" id="ai-messages"></div>
          <div class="ai-input-row">
            <input id="ai-input" placeholder="e.g. I love coding and math..." onkeydown="aiKeydown(event)"/>
            <button class="ai-send-btn" onclick="sendAiMessage()">→</button>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="sidebar-card">
        <h3>Filters</h3>

        <div class="form-group">
          <div class="form-label">Mode</div>
          <div class="checkbox-group">
            ${['online','in-person','hybrid','international'].map(m => `
              <label class="checkbox-item">
                <input type="checkbox" ${State.mode.includes(m)?'checked':''}
                  onchange="toggleModeFilter('${m}')"/>
                <span>${m.charAt(0).toUpperCase()+m.slice(1)}</span>
              </label>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <div class="form-label">Level</div>
          <div class="checkbox-group">
            ${[['national','National (BD)'],['international','International']].map(([v,l]) => `
              <label class="checkbox-item">
                <input type="radio" name="level" value="${v}" ${State.level===v?'checked':''}
                  onchange="setLevel('${v}')"/>
                <span>${l}</span>
              </label>`).join('')}
            <label class="checkbox-item">
              <input type="radio" name="level" value="" ${!State.level?'checked':''}
                onchange="setLevel('')"/>
              <span>All levels</span>
            </label>
          </div>
        </div>

        <button class="btn btn-secondary btn-sm btn-block" onclick="clearFilters()">Clear Filters</button>
      </div>

      <!-- Quick Stats -->
      <div class="sidebar-card">
        <h3>Platform Stats</h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:var(--text2)">Active Opportunities</span>
            <strong>${State.opps.length}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:var(--text2)">Community Members</span>
            <strong>12,000+</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:var(--text2)">Countries Reached</span>
            <strong>48+</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:var(--text2)">Total Prize Pool</span>
            <strong style="color:var(--green)">$1M+</strong>
          </div>
        </div>
      </div>
    </aside>
  `;
}

function toggleModeFilter(m) {
  if (State.mode.includes(m)) State.mode = State.mode.filter(x=>x!==m);
  else State.mode.push(m);
  renderOpportunitiesContent();
}
function setLevel(v) { State.level = v; renderOpportunitiesContent(); }
function clearFilters() {
  State.mode = []; State.level = ''; State.search = ''; State.category = 'all';
  renderOpportunitiesContent();
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

/* HOME */
function renderHome() {
  const featured = State.opps.filter(o => o.featured).slice(0, 3);
  const trusted = State.partners.trustedBy || [];

  return `
    <div class="page">
      <!-- Hero -->
      <div class="home-hero">
        <div class="hero-eyebrow">
          <span class="hero-eyebrow-dot"></span>
          Bangladesh's #1 Opportunity Hub — Updated Daily
        </div>
        <h1>Find Your <em>Next Big</em><br/>Opportunity</h1>
        <p class="sub">Competitions, scholarships, hackathons & fellowships — curated for ambitious students across Bangladesh and the world.</p>

        <div class="hero-search-wrap">
          <div class="search-bar" id="hero-search-bar">
            <div class="search-bar-icon">🔍</div>
            <input id="hero-q" placeholder="Search competitions, scholarships, hackathons..."
              onkeydown="if(event.key==='Enter')heroSearch()"
              oninput="document.getElementById('hero-clear').style.display=this.value?'block':'none'"/>
            <button class="search-bar-clear" id="hero-clear" style="display:none"
              onclick="document.getElementById('hero-q').value='';this.style.display='none'">×</button>
            <button class="search-bar-btn" onclick="heroSearch()">Search</button>
          </div>
        </div>

        <div class="hero-pills">
          ${NAV_CATEGORIES.slice(0,6).map(c=>`
            <button class="hero-pill" onclick="navigate('opportunities',{category:'${c.cat}'})">
              ${c.icon} ${c.label}
            </button>`).join('')}
        </div>

        <div class="hero-stats">
          <div class="hero-stat"><div class="hero-stat-num">${State.opps.length}<span>+</span></div><div class="hero-stat-label">Active Opportunities</div></div>
          <div class="hero-stat"><div class="hero-stat-num">12<span>K+</span></div><div class="hero-stat-label">Community Members</div></div>
          <div class="hero-stat"><div class="hero-stat-num">48<span>+</span></div><div class="hero-stat-label">Countries</div></div>
          <div class="hero-stat"><div class="hero-stat-num">100<span>%</span></div><div class="hero-stat-label">Free Forever</div></div>
        </div>
      </div>

      <!-- Trusted By -->
      ${trusted.length ? `
      <div class="trusted-strip">
        <div class="trusted-strip-inner">
          <div class="trusted-label">Trusted by students from</div>
          <div class="trusted-logos">
            ${trusted.map(t=>`
              <a href="${t.url}" target="_blank" rel="noopener" class="trusted-logo-item">
                <span>${t.logo}</span> <span>${t.name}</span>
              </a>`).join('')}
          </div>
        </div>
      </div>` : ''}

      <!-- Featured -->
      <div style="background:var(--surface);border-bottom:1px solid var(--border);padding:36px 0">
        <div class="container">
          <div class="section-head-row">
            <div class="section-head">
              <div class="section-title">⭐ Featured Opportunities</div>
              <div class="section-sub">Handpicked high-value opportunities closing soon</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="navigate('opportunities')">View all →</button>
          </div>
          <div class="opp-list">
            ${featured.map(renderOppCard).join('')}
          </div>
        </div>
      </div>

      <!-- Browse by Category -->
      <div class="container" style="padding-top:36px;padding-bottom:36px">
        <div class="section-head-row">
          <div class="section-title">Browse by Category</div>
          <button class="btn btn-ghost btn-sm" onclick="navigate('opportunities')">See all →</button>
        </div>
        <div class="cat-grid">
          ${NAV_CATEGORIES.map(c => {
            const count = State.opps.filter(o=>o.category===c.cat).length;
            return `
            <button class="cat-card" onclick="navigate('opportunities',{category:'${c.cat}'})">
              <div class="cat-card-icon">${c.icon}</div>
              <div class="cat-card-name">${c.label}</div>
              <div class="cat-card-count">${count} active</div>
              <div class="cat-card-arrow">→</div>
            </button>`;
          }).join('')}
        </div>
      </div>

      <!-- Community / Social Proof -->
      <div style="background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:48px 0">
        <div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center">
          <div>
            <div style="font-size:12px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px">Community</div>
            <h2 style="font-family:var(--font-display);font-size:28px;font-weight:800;margin-bottom:16px;line-height:1.2">12,000+ Students<br/>Already Ahead</h2>
            <p style="font-size:15px;color:var(--text2);line-height:1.7;margin-bottom:20px">"nextECA helped me find Chevening when I had no idea where to even look. Now I'm studying in London."</p>
            <p style="font-size:13px;color:var(--text3);margin-bottom:24px">— Rafiul Islam, Chevening Scholar 2024, BUET</p>
            <a href="https://www.facebook.com/groups/nexteca" target="_blank" rel="noopener" class="btn btn-primary">Join Facebook Community →</a>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${[[(State.opps.length+'+'),'Active Listings'],['12K+','Members'],['48+','Countries'],['100%','Free']].map(([n,l])=>`
              <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px">
                <div style="font-family:var(--font-display);font-size:32px;font-weight:800;color:var(--text)">${n}</div>
                <div style="font-size:12px;color:var(--text3);margin-top:4px">${l}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      ${renderFooter()}
    </div>
  `;
}

function heroSearch() {
  const q = document.getElementById('hero-q')?.value.trim() || '';
  State.search = q;
  navigate('opportunities');
}

/* OPPORTUNITIES */
function renderOpportunities() {
  return `
    <div class="page">
      ${renderCatStrip()}
      <div class="container" style="padding-top:20px;padding-bottom:40px">
        <div class="two-col">
          ${renderSidebar()}
          <main class="content-area" id="opps-main">
            ${renderOpportunitiesContent(true)}
          </main>
        </div>
      </div>
      ${renderFooter()}
    </div>
  `;
}

function renderOpportunitiesContent(initial = false) {
  const filtered = getFiltered();
  const html = `
    <!-- Search bar -->
    <div class="search-bar" style="box-shadow:none">
      <div class="search-bar-icon">🔍</div>
      <input id="opps-q" placeholder="Search opportunities..."
        value="${esc(State.search)}"
        oninput="liveSearch(this.value)"
        onkeydown="if(event.key==='Enter')doSearch()"/>
      ${State.search ? `<button class="search-bar-clear" onclick="clearSearch()">×</button>` : ''}
      <button class="search-bar-btn" onclick="doSearch()">Search</button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        Showing <strong>${filtered.length}</strong> of ${State.opps.length} opportunities
        ${State.category !== 'all' ? `<span class="badge ${badgeClass(State.category)}" style="margin-left:8px">${State.category} ×</span>` : ''}
      </div>
      <div class="toolbar-right">
        <select class="sort-select" onchange="setSort(this.value)">
          <option value="deadline" ${State.sort==='deadline'?'selected':''}>Sort: Deadline</option>
          <option value="featured" ${State.sort==='featured'?'selected':''}>Sort: Featured First</option>
        </select>
        <div class="view-toggle">
          <button class="view-toggle-btn ${State.view==='list'?'active':''}" onclick="setView('list')" title="List view">☰</button>
          <button class="view-toggle-btn ${State.view==='grid'?'active':''}" onclick="setView('grid')" title="Grid view">⊞</button>
        </div>
      </div>
    </div>

    <!-- Results -->
    ${filtered.length === 0
      ? `<div class="empty-state">
           <div class="empty-state-icon">🔍</div>
           <h3>No opportunities found</h3>
           <p>Try a different search term or clear your filters.</p>
           <button class="btn btn-primary" onclick="clearFilters()">Clear all filters</button>
         </div>`
      : State.view === 'list'
        ? `<div class="opp-list">${filtered.map(renderOppCard).join('')}</div>`
        : `<div class="opp-grid">${filtered.map(renderOppGridCard).join('')}</div>`
    }
  `;

  if (!initial) {
    const main = document.getElementById('opps-main');
    if (main) main.innerHTML = html;
    // Re-init AI messages
    renderAiMessages();
  }
  return html;
}

let searchTimer;
function liveSearch(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { State.search = val; renderOpportunitiesContent(); }, 220);
}
function doSearch() { State.search = document.getElementById('opps-q')?.value || ''; renderOpportunitiesContent(); }
function clearSearch() { State.search = ''; renderOpportunitiesContent(); }
function setSort(v) { State.sort = v; renderOpportunitiesContent(); }
function setView(v) { State.view = v; renderOpportunitiesContent(); }

/* DETAIL */
function renderDetail() {
  const opp = State.opps.find(o => o.id === State.detailId);
  if (!opp) return `<div class="container" style="padding:60px 24px;text-align:center">
    <div style="font-size:40px;margin-bottom:16px">😕</div>
    <h2>Opportunity not found</h2>
    <p style="color:var(--text2);margin:10px 0 20px">It may have been removed or the link is invalid.</p>
    <button class="btn btn-primary" onclick="navigate('opportunities')">Browse All Opportunities</button>
  </div>`;

  const dl = daysLeft(opp.deadline);
  const saved = State.saved.includes(opp.id);
  const related = State.opps.filter(o => o.category === opp.category && o.id !== opp.id).slice(0, 2);

  return `
    <div class="page">
      <div class="container">
        <!-- Breadcrumb -->
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <button onclick="navigate('home')">Home</button>
          <span class="sep">›</span>
          <button onclick="navigate('opportunities')">Opportunities</button>
          <span class="sep">›</span>
          <button onclick="navigate('opportunities',{category:'${opp.category}'})">${esc(opp.category)}</button>
          <span class="sep">›</span>
          <span class="current">${esc(opp.title)}</span>
        </nav>

        <div class="detail-layout">
          <!-- Main -->
          <div class="detail-main">
            <div class="detail-hero">
              <div class="detail-logo">${esc(opp.logo)}</div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
                <span class="badge ${badgeClass(opp.category)}">${esc(opp.category)}</span>
                ${opp.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
                <span class="deadline-badge ${deadlineClass(dl)}">${deadlineLabel(dl)}</span>
              </div>
              <h1 class="detail-title">${esc(opp.title)}</h1>
              <div class="detail-org">${esc(opp.org)}</div>
              <div class="opp-tags">
                ${opp.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}
              </div>
            </div>

            <div class="detail-body">
              <h2>About This Opportunity</h2>
              <p>${esc(opp.description)}</p>

              <h2>Key Details</h2>
              <div class="detail-facts">
                <div class="detail-fact"><div class="detail-fact-label">📍 Location</div><div class="detail-fact-value">${esc(opp.location)}</div></div>
                <div class="detail-fact"><div class="detail-fact-label">🏅 Prize / Award</div><div class="detail-fact-value">${esc(opp.prize)}</div></div>
                <div class="detail-fact"><div class="detail-fact-label">🗓 Application Deadline</div><div class="detail-fact-value" style="color:var(--accent)">${formatDate(opp.deadline)}</div></div>
                <div class="detail-fact"><div class="detail-fact-label">🌐 Mode</div><div class="detail-fact-value">${esc(opp.mode.charAt(0).toUpperCase()+opp.mode.slice(1))}</div></div>
              </div>

              <h2>Eligibility</h2>
              <p>${esc(opp.eligibility)}</p>

              ${opp.tips ? `
              <h2>💡 Tips for Applying</h2>
              <ul>
                ${opp.tips.split('. ').filter(Boolean).map(t=>`<li>${esc(t)}</li>`).join('')}
              </ul>` : ''}

              <h2>How to Apply</h2>
              <p>Click the <strong>"Apply on Official Site"</strong> button to visit the official application page. Make sure to read all instructions carefully before starting your application.</p>
              <p>Deadline: <strong style="color:var(--accent)">${formatDate(opp.deadline)}</strong> — <span class="deadline-badge ${deadlineClass(dl)}">${deadlineLabel(dl)}</span></p>

              <div style="margin-top:20px;padding:16px;background:var(--brand-dim);border-radius:var(--radius);border-left:3px solid var(--brand)">
                <strong style="color:var(--brand)">💬 Pro Tip:</strong>
                <span style="font-size:14px;color:var(--text2)"> Join our <a href="https://www.facebook.com/groups/nexteca" target="_blank" style="color:var(--brand);font-weight:600">Facebook community</a> to connect with past applicants and get insider tips from people who've been through this process.</span>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div>
            <div class="detail-sidebar-card">
              <button class="detail-apply-btn" onclick="window.open('${opp.link}','_blank')">
                Apply on Official Site ↗
              </button>
              <button class="detail-save-btn${saved?' saved':''}" data-id="${opp.id}"
                onclick="toggleSaved('${opp.id}')">
                ${saved ? '🔖 Saved' : '🔖 Save for Later'}
              </button>
            </div>

            <div class="detail-sidebar-card">
              <h3>Quick Facts</h3>
              <div class="meta-row"><span class="meta-label">Category</span><span class="meta-value">${esc(opp.category)}</span></div>
              <div class="meta-row"><span class="meta-label">Organizer</span><span class="meta-value">${esc(opp.org)}</span></div>
              <div class="meta-row"><span class="meta-label">Location</span><span class="meta-value">${esc(opp.location)}</span></div>
              <div class="meta-row"><span class="meta-label">Mode</span><span class="meta-value">${esc(opp.mode)}</span></div>
              <div class="meta-row"><span class="meta-label">Prize</span><span class="meta-value" style="color:var(--green)">${esc(opp.prize)}</span></div>
              <div class="meta-row"><span class="meta-label">Deadline</span><span class="meta-value" style="color:var(--accent)">${formatDate(opp.deadline)}</span></div>
            </div>

            <div class="detail-sidebar-card">
              <h3>Share This Opportunity</h3>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}" target="_blank" class="btn btn-secondary btn-sm" style="justify-content:center">📘 Facebook</a>
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(opp.title+' on nextECA')}&url=${encodeURIComponent(location.href)}" target="_blank" class="btn btn-secondary btn-sm" style="justify-content:center">🐦 Twitter</a>
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(location.href)}" target="_blank" class="btn btn-secondary btn-sm" style="justify-content:center">💼 LinkedIn</a>
                <button class="btn btn-secondary btn-sm" onclick="copyLink()">🔗 Copy Link</button>
              </div>
            </div>

            <div class="detail-sidebar-card" style="background:var(--brand-dim);border-color:rgba(0,82,204,.2)">
              <h3 style="color:var(--brand)">🤖 Get AI Help</h3>
              <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Not sure if this is right for you? Our AI can help you decide.</p>
              <button class="btn btn-primary btn-sm btn-block" onclick="navigate('opportunities')">Ask AI Assistant →</button>
            </div>
          </div>
        </div>

        <!-- Related -->
        ${related.length ? `
        <div style="margin-top:32px">
          <div class="section-head-row">
            <div class="section-title">Similar ${esc(opp.category)} Opportunities</div>
            <button class="btn btn-ghost btn-sm" onclick="navigate('opportunities',{category:'${opp.category}'})">View all →</button>
          </div>
          <div class="opp-list">${related.map(renderOppCard).join('')}</div>
        </div>` : ''}
      </div>
      ${renderFooter()}
    </div>
  `;
}

function copyLink() {
  navigator.clipboard.writeText(location.href).then(() => toast('Link copied!', 'success'));
}

/* SUBMIT */
function renderSubmit() {
  return `
    <div class="page">
      <div class="submit-wrap">
        <h1>Submit an Opportunity</h1>
        <p class="sub">Know about a competition, scholarship, or program? Share it with 12,000+ students on nextECA. Free, takes 2 minutes.</p>

        <div style="background:var(--brand-dim);border:1px solid rgba(0,82,204,.2);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:24px;font-size:13px;color:var(--brand)">
          <strong>ℹ️ How it works:</strong> Fill the form below. Your submission goes to our GitHub Issues tracker. Our team reviews and adds it to the site within 48 hours. Once merged, it appears live automatically.
        </div>

        <form class="form-card" id="submit-form" onsubmit="handleSubmit(event)">
          <div class="form-section-head">📋 Basic Information</div>

          <div class="form-group">
            <label class="form-label">Opportunity Title <span class="req">*</span></label>
            <input class="input" name="title" placeholder="e.g. Google Science Fair 2025" required/>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Category <span class="req">*</span></label>
              <select class="select-input" name="category" required>
                <option value="">Select category</option>
                <option>Hackathon</option><option>Scholarship</option><option>Competition</option>
                <option>Fellowship</option><option>Research</option><option>Olympiad</option>
                <option>Exchange Program</option><option>Conference</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Organizing Body <span class="req">*</span></label>
              <input class="input" name="org" placeholder="e.g. NASA, Google, ICT Division" required/>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Application Deadline <span class="req">*</span></label>
              <input class="input" type="date" name="deadline" required/>
            </div>
            <div class="form-group">
              <label class="form-label">Mode</label>
              <select class="select-input" name="mode">
                <option value="online">Online</option>
                <option value="in-person">In-person</option>
                <option value="hybrid">Hybrid</option>
                <option value="international">International</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Official Link <span class="req">*</span></label>
            <input class="input" type="url" name="link" placeholder="https://..." required/>
            <div class="form-hint">Direct link to the official application or information page.</div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Prize / Award</label>
              <input class="input" name="prize" placeholder="e.g. $10,000, Full scholarship"/>
            </div>
            <div class="form-group">
              <label class="form-label">Location</label>
              <input class="input" name="location" placeholder="e.g. Global, Dhaka, UK"/>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description <span class="req">*</span></label>
            <textarea class="textarea" name="description" placeholder="Briefly describe the opportunity, what participants do, and why students should apply..." required></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Eligibility</label>
            <input class="input" name="eligibility" placeholder="e.g. Bangladeshi nationals, undergraduate students, ages 18-25"/>
          </div>

          <div class="form-group">
            <label class="form-label">Tags (comma separated)</label>
            <input class="input" name="tags" placeholder="e.g. STEM, Global, Fully Funded, Youth"/>
          </div>

          <div class="form-section-head" style="margin-top:8px">👤 Your Details (Optional)</div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Your Name</label>
              <input class="input" name="submitter_name" placeholder="Your name"/>
            </div>
            <div class="form-group">
              <label class="form-label">Your Email</label>
              <input class="input" type="email" name="submitter_email" placeholder="your@email.com"/>
              <div class="form-hint">We'll notify you when it goes live.</div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-xl btn-block" style="margin-top:8px">
            Submit Opportunity →
          </button>
          <div style="text-align:center;font-size:12px;color:var(--text3);margin-top:10px">
            By submitting you agree it will be publicly listed on nextECA after review.
          </div>
        </form>
      </div>
      ${renderFooter()}
    </div>
  `;
}

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button[type=submit]');
  const data = Object.fromEntries(new FormData(form));

  // ── Client-side validation ──────────────────────────────
  const required = { title:'Title', category:'Category', org:'Organizing Body', deadline:'Deadline', link:'Official Link', description:'Description' };
  let firstError = null;
  for (const [field, label] of Object.entries(required)) {
    const el = form.querySelector(`[name="${field}"]`);
    if (!data[field] || !data[field].trim()) {
      if (el) { el.classList.add('error'); el.focus(); }
      if (!firstError) firstError = label;
    } else {
      if (el) el.classList.remove('error');
    }
  }
  if (firstError) { toast(`Please fill in: ${firstError}`, 'error'); return; }

  // ── URL validation ─────────────────────────────────────
  try { new URL(data.link); } catch {
    const el = form.querySelector('[name="link"]');
    if (el) { el.classList.add('error'); el.focus(); }
    toast('Please enter a valid URL (include https://)', 'error');
    return;
  }

  // ── Deadline in the future? ────────────────────────────
  const dl = new Date(data.deadline);
  if (dl < new Date()) {
    const el = form.querySelector('[name="deadline"]');
    if (el) { el.classList.add('error'); el.focus(); }
    toast('Deadline must be in the future', 'error');
    return;
  }

  // ── Submit ─────────────────────────────────────────────
  btn.textContent = 'Submitting…'; btn.disabled = true;

  try {
    const res = await fetch('/.netlify/functions/submit-opportunity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || `Server error ${res.status}`);
    }

    // ── Success screen ─────────────────────────────────
    const channels = result.channels || {};
    document.getElementById('app').innerHTML = `
      <div style="min-height:70vh;display:flex;align-items:center;justify-content:center;padding:40px">
        <div style="text-align:center;max-width:500px">
          <div style="font-size:60px;margin-bottom:20px">🎉</div>
          <h2 style="font-family:var(--font-display);font-size:30px;font-weight:800;margin-bottom:10px">Submission Received!</h2>
          <p style="font-size:15px;color:var(--text2);margin-bottom:28px;line-height:1.7">
            Thank you! <strong>${esc(data.title)}</strong> has been sent to our team for review.
            We'll publish it within <strong>48 hours</strong> if it meets our guidelines.
          </p>

          <!-- Channel status -->
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:28px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:18px">
            <div style="font-size:12px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Notifications sent to team</div>
            <div style="display:flex;align-items:center;gap:8px;font-size:14px">
              <span>${channels.email === 'sent' ? '✅' : '⚠️'}</span>
              <span>Email → hello@nexteca.club</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:14px">
              <span>${channels.github && channels.github !== 'failed' ? '✅' : '⚠️'}</span>
              <span>GitHub Issue created for team review</span>
              ${channels.github && channels.github !== 'failed'
                ? `<a href="${channels.github}" target="_blank" style="color:var(--brand);font-size:12px;font-weight:600">View →</a>`
                : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:14px">
              <span>${channels.telegram === 'sent' ? '✅' : '⚠️'}</span>
              <span>Telegram team notification</span>
            </div>
          </div>

          ${data.submitter_email ? `<p style="font-size:13px;color:var(--text3);margin-bottom:24px">We'll email <strong>${esc(data.submitter_email)}</strong> when it goes live.</p>` : ''}

          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="navigate('opportunities')">Browse Opportunities</button>
            <button class="btn btn-secondary" onclick="navigate('submit')">Submit Another</button>
          </div>
        </div>
      </div>
      ${renderFooter()}
    `;

  } catch (err) {
    console.error('Submission error:', err);
    btn.textContent = 'Submit Opportunity →';
    btn.disabled = false;
    toast(`Submission failed: ${err.message}. Please try again.`, 'error');
  }
}

/* ABOUT */
function renderAbout() {
  return `
    <div class="page">
      <div class="about-hero">
        <h1>For The Community,<br/><em>By The Community</em></h1>
        <p>nextECA is Bangladesh's leading platform helping ambitious students discover competitions, scholarships, hackathons, and fellowships — locally and globally.</p>
      </div>

      <div class="about-body">
        <div class="about-section">
          <h2>Our Mission</h2>
          <p>Every year, thousands of life-changing competitions, scholarships, and programs go unapplied because students simply don't know they exist. nextECA was built to fix that.</p>
          <p>We curate and verify hundreds of opportunities across Bangladesh and the world, making them accessible to every ambitious student — regardless of where they study or who they know.</p>
          <p>We believe talent is equally distributed, but opportunity is not. We're here to change that.</p>
        </div>

        <div class="about-section">
          <h2>What We Offer</h2>
          <div class="about-feature-grid">
            ${[
              ['🏆','Verified Listings','Every opportunity is reviewed and verified before going live.'],
              ['🤖','AI Matching','Our AI suggests the best opportunities based on your interests.'],
              ['👥','Community','12,000+ students sharing tips, results, and support.'],
              ['🔔','Deadline Tracking','Never miss a deadline with saved opportunities.'],
              ['📖','Insider Tips','Application tips from past winners in our community.'],
              ['🌍','Global Reach','Opportunities from 48+ countries, curated for BD students.'],
            ].map(([i,t,d])=>`
              <div class="about-feature">
                <div class="about-feature-icon">${i}</div>
                <h3>${t}</h3><p>${d}</p>
              </div>`).join('')}
          </div>
        </div>

        <div class="about-section">
          <h2>The Team</h2>
          <p>Built by students, for students. Our founding team comes from top universities in Bangladesh and is driven by a shared belief that every student deserves access to life-changing opportunities.</p>
          <div class="team-grid">
            ${[
              ['👥','Founding Team','Builders & Community Leaders','#E9F2FF'],
              ['💻','Contributors','Open Source @ GitHub','#E3FCEF'],
              ['🌍','Community','12K+ Strong Members','#FFF0B3'],
              ['🤝','Partners','Organizations & Unis','#EAE6FF'],
            ].map(([av,n,r,bg])=>`
              <div class="team-card">
                <div class="team-avatar" style="background:${bg}">${av}</div>
                <div class="team-name">${n}</div>
                <div class="team-role">${r}</div>
              </div>`).join('')}
          </div>
        </div>

        <div class="about-section" style="background:var(--brand-dim);border-radius:var(--radius-xl);padding:28px;border:1px solid rgba(0,82,204,.15)">
          <h2 style="color:var(--brand)">📈 Backed by the Community</h2>
          <p>nextECA is applying for pre-seed funding through ICT Division Bangladesh, YY Ventures, and the Alibaba Entrepreneurship Fund to scale our impact across South Asia.</p>
          <p>We are open-source and community-driven, committed to keeping our core service free forever.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="navigate('submit')">Submit an Opportunity →</button>
            <a href="https://github.com/nextPrtnr/nextECA" target="_blank" class="btn btn-secondary">⭐ Star on GitHub</a>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </div>
  `;
}

/* PARTNERS */
function renderPartners() {
  const { trustedBy, mediaPartners, communityPartners } = State.partners;
  return `
    <div class="page">
      <div style="background:var(--surface);border-bottom:1px solid var(--border);padding:52px 24px;text-align:center">
        <div style="font-size:12px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">Our Network</div>
        <h1 style="font-family:var(--font-display);font-size:clamp(28px,4vw,44px);font-weight:800;margin-bottom:12px">Partners & Trusted By</h1>
        <p style="font-size:16px;color:var(--text2);max-width:500px;margin:0 auto">nextECA is trusted by students, universities, and organizations across Bangladesh and beyond.</p>
      </div>

      <div class="container" style="padding-top:48px;padding-bottom:60px">

        <!-- Trusted By Universities -->
        <div style="margin-bottom:48px">
          <div class="section-title" style="margin-bottom:20px">🏫 Trusted by Universities</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            ${(trustedBy||[]).filter(t=>t.type==='university').map(t=>`
              <a href="${t.url}" target="_blank" rel="noopener" class="partner-item">
                <span class="picon">${t.logo}</span>${t.name}
              </a>`).join('')}
          </div>
        </div>

        <!-- Government Partners -->
        <div style="margin-bottom:48px">
          <div class="section-title" style="margin-bottom:20px">🏛️ Government & Official Bodies</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            ${(trustedBy||[]).filter(t=>t.type==='government'||t.type==='association').map(t=>`
              <a href="${t.url}" target="_blank" rel="noopener" class="partner-item">
                <span class="picon">${t.logo}</span>${t.name}
              </a>`).join('')}
          </div>
        </div>

        <!-- Media Partners -->
        <div style="margin-bottom:48px">
          <div class="section-title" style="margin-bottom:20px">📰 Media Partners</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            ${(mediaPartners||[]).map(t=>`
              <a href="${t.url}" target="_blank" rel="noopener" class="partner-item">
                <span class="picon">${t.logo}</span>${t.name}
              </a>`).join('')}
          </div>
        </div>

        <!-- Community Partners -->
        <div style="margin-bottom:48px">
          <div class="section-title" style="margin-bottom:20px">👥 Community Partners</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            ${(communityPartners||[]).map(t=>`
              <a href="${t.url}" target="_blank" rel="noopener" class="partner-item">
                <span class="picon">${t.logo}</span>
                <span>
                  <span style="display:block;font-weight:700">${t.name}</span>
                  <span style="font-size:11px;color:var(--text3)">${t.members}</span>
                </span>
              </a>`).join('')}
          </div>
        </div>

        <!-- Become a Partner -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);padding:36px;text-align:center">
          <div style="font-size:40px;margin-bottom:14px">🤝</div>
          <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;margin-bottom:10px">Become a Partner</h2>
          <p style="font-size:15px;color:var(--text2);max-width:440px;margin:0 auto 24px;line-height:1.7">
            Partner with nextECA to reach 12,000+ ambitious students across Bangladesh. List your events, scholarships, and programs free of charge.
          </p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary btn-lg" onclick="navigate('submit')">List Your Opportunity →</button>
            <a href="mailto:hello@nexteca.club" class="btn btn-secondary btn-lg">Get in Touch</a>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </div>
  `;
}

/* SAVED */
function renderSaved() {
  const savedOpps = State.opps.filter(o => State.saved.includes(o.id));
  return `
    <div class="page">
      <div class="container" style="padding-top:32px;padding-bottom:48px">
        <div class="section-head-row">
          <div>
            <div class="section-title">🔖 Saved Opportunities</div>
            <div class="section-sub">${savedOpps.length} saved</div>
          </div>
          ${savedOpps.length ? `<button class="btn btn-ghost btn-sm" onclick="if(confirm('Clear all saved?')){State.saved=[];saveSaved();renderPage()}">Clear All</button>` : ''}
        </div>
        ${savedOpps.length === 0
          ? `<div class="empty-state">
               <div class="empty-state-icon">🔖</div>
               <h3>No saved opportunities yet</h3>
               <p>Bookmark opportunities while browsing to save them here for later.</p>
               <button class="btn btn-primary" onclick="navigate('opportunities')">Browse Opportunities</button>
             </div>`
          : `<div class="opp-list">${savedOpps.map(o=>renderOppCard(o)).join('')}</div>`}
      </div>
      ${renderFooter()}
    </div>
  `;
}

/* FOOTER */
function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div class="nav-logo-mark">N</div>
              <span class="nav-logo-text">next<span>ECA</span></span>
            </div>
            <p class="footer-brand-desc">Bangladesh's global opportunity hub. For the community, by the community. Always free.</p>
            <div class="footer-social">
              <a href="https://facebook.com/nexteca.org/" target="_blank" rel="noopener" class="footer-social-btn">f</a>
              <a href="https://instagram.com/" target="_blank" rel="noopener" class="footer-social-btn">ig</a>
              <a href="https://x.com/" target="_blank" rel="noopener" class="footer-social-btn">𝕏</a>
              <a href="https://linkedin.com/company/nexteca" target="_blank" rel="noopener" class="footer-social-btn">in</a>
              <a href="https://github.com/nextPrtnr/nextECA" target="_blank" rel="noopener" class="footer-social-btn">gh</a>
            </div>
          </div>
          <div class="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><button onclick="navigate('opportunities')">Browse Opportunities</button></li>
              <li><button onclick="navigate('submit')">Submit Opportunity</button></li>
              <li><button onclick="navigate('saved')">Saved</button></li>
              <li><button onclick="navigate('partners')">Partners</button></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Community</h4>
            <ul>
              <li><a href="https://www.facebook.com/groups/nexteca" target="_blank" rel="noopener">Facebook Group</a></li>
              <li><a href="https://github.com/nextPrtnr/nextECA" target="_blank" rel="noopener">GitHub (Open Source)</a></li>
              <li><a href="mailto:hello@nexteca.club">Contact Us</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Company</h4>
            <ul>
              <li><button onclick="navigate('about')">About Us</button></li>
              <li><button onclick="navigate('partners')">Partners</button></li>
              <li><a href="mailto:hello@nexteca.club">hello@nexteca.club</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2026 nextECA. All rights reserved. Made with ❤️ in Bangladesh.</p>
          <p><a href="https://github.com/nextPrtnr/nextECA" target="_blank" rel="noopener" style="color:var(--brand);font-weight:600">Open Source on GitHub ↗</a></p>
        </div>
      </div>
    </footer>
  `;
}

// ─── MAIN RENDER ──────────────────────────────────────────────────────────────
function renderPage() {
  renderNav();
  const app = document.getElementById('app');

  const pages = {
    home: renderHome,
    opportunities: renderOpportunities,
    detail: renderDetail,
    submit: renderSubmit,
    about: renderAbout,
    partners: renderPartners,
    saved: renderSaved,
  };

  app.innerHTML = (pages[State.page] || renderHome)();

  // Post-render: hydrate AI messages, update nav active
  if (State.page === 'opportunities') {
    renderAiMessages();
  }
}

function showComingSoon() {
  toast('Login coming soon! Join our Facebook community for now.', 'success');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  await loadData();
  const { page, params } = parseHash();
  State.page = page;
  if (params?.id) State.detailId = params.id;
  if (params?.cat) State.category = params.cat;
  renderPage();
  // Hide loading screen, show app
  if (typeof window.__appReady === 'function') window.__appReady();
}

init();

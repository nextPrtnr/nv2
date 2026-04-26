# nextECA 🚀
**Bangladesh's #1 Opportunity Hub** — Competitions, Scholarships, Hackathons & Fellowships

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-BADGE-ID/deploy-status)](https://app.netlify.com/sites/nexteca/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Opportunities](https://img.shields.io/badge/Opportunities-500%2B-orange)](data/opportunities.json)

> Live site → **[nextECA.club](https://nexteca.club)**

---

## 📁 File Structure

```
nextECA/
│
├── index.html                  ← Single entry point (SPA shell)
│
├── css/
│   └── style.css               ← Complete design system & all page styles
│
├── js/
│   └── app.js                  ← Full application: router, pages, AI, filtering
│
├── data/
│   ├── opportunities.json      ← ⭐ ADD NEW OPPORTUNITIES HERE
│   ├── partners.json           ← Partner & trusted-by logos
│   ├── submissions.json        ← Received form submissions log
│   └── opportunity-template.json ← Copy-paste template for new entries
│
├── assets/
│   ├── favicon.svg             ← Site favicon
│   ├── og-image.png            ← Social share preview image (1200×630px)
│   └── apple-touch-icon.png    ← iOS home screen icon (180×180px)
│
├── .github/
│   ├── workflows/
│   │   └── deploy.yml          ← Auto-deploy on push + JSON validation
│   └── ISSUE_TEMPLATE/
│       └── submit-opportunity.md ← GitHub Issue template for submissions
│
├── netlify.toml                ← Netlify: redirects, headers, caching
├── _redirects                  ← Netlify SPA fallback (backup)
├── .gitignore
└── README.md
```

---

## ⚡ Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `#/home` | Hero, featured opps, category grid, community stats |
| Opportunities | `#/opportunities` | Full listing with AI sidebar, filters, search |
| Detail | `#/detail/:id` | Full opportunity page with apply button |
| Submit | `#/submit` | Form to submit new opportunities |
| About | `#/about` | Mission, team, investor info |
| Partners | `#/partners` | Trusted-by logos, partner categories |
| Saved | `#/saved` | Bookmarked opportunities (localStorage) |

---

## ➕ Adding a New Opportunity

**This is all you need to do:**

1. Open `data/opportunities.json`
2. Add a new JSON object to the array (copy from `data/opportunity-template.json`)
3. Commit and push to `main`
4. GitHub Actions validates the JSON and Netlify auto-deploys in ~30 seconds

### Example entry:
```json
{
  "id": "my-hackathon-2025",
  "title": "My Awesome Hackathon 2025",
  "org": "Some Organization",
  "logo": "⚡",
  "category": "Hackathon",
  "tags": ["Tech", "Bangladesh", "Cash Prize"],
  "location": "Dhaka, Bangladesh",
  "mode": "in-person",
  "deadline": "2025-12-01",
  "prize": "৳5 Lakh",
  "prizeAmount": "৳5,00,000",
  "featured": false,
  "description": "A 48-hour hackathon open to all university students...",
  "eligibility": "University students in Bangladesh",
  "link": "https://myhackathon.com/apply",
  "tips": "Come with a team. Focus on a real local problem.",
  "country": "Bangladesh",
  "level": "national"
}
```

### Required fields
| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Unique, kebab-case, URL-safe |
| `title` | string | Full official title |
| `org` | string | Organizing body name |
| `category` | string | See options below |
| `deadline` | string | Format: `YYYY-MM-DD` |
| `link` | string | Official application URL |
| `description` | string | 2-4 sentences |

### Category options
`Hackathon` · `Scholarship` · `Competition` · `Fellowship` · `Research` · `Olympiad` · `Exchange` · `Conference`

---

## 🚀 Deployment

### Netlify (recommended — free)
1. Connect your GitHub repo to [Netlify](https://netlify.com)
2. Set **Publish directory** to `.` (the repo root)
3. Leave **Build command** blank
4. Add these environment secrets in Netlify dashboard:
   - No secrets needed for basic hosting
5. For GitHub Actions auto-deploy, add in repo **Settings → Secrets**:
   - `NETLIFY_AUTH_TOKEN` — from Netlify User Settings → Personal Access Tokens
   - `NETLIFY_SITE_ID` — from Site Settings → General → Site ID

### GitHub Pages (alternative — free)
1. Go to repo **Settings → Pages**
2. Set source to **Deploy from a branch → main → / (root)**
3. Done. Site will be at `https://yourusername.github.io/nextECA/`
4. Note: hash-based routing (`#/page`) works fine on GitHub Pages

---

## 📬 Form Submissions (Netlify Forms — free)

When someone submits via the Submit page:
1. Netlify captures the form data (free up to 100/month)
2. You receive an email notification (configure in Netlify UI → Forms → Notifications)
3. Review the submission in Netlify dashboard → Forms
4. If valid, manually add it to `data/opportunities.json` and push

**To get email notifications:**
- Netlify Dashboard → Your Site → Forms → opportunity-submit → Settings → Add email notification

---

## 🤖 AI Assistant

The AI sidebar on the Opportunities page uses the Anthropic Claude API. It reads all current opportunities from state and suggests matches based on user input.

The API key is handled server-side by Anthropic's infrastructure when called from `claude.ai`. If you self-host and want the AI to work, you'll need to proxy the API call through a serverless function (e.g. Netlify Function) and store your `ANTHROPIC_API_KEY` as an environment variable — never in client-side code.

---

## 🤝 Contributing

1. Fork the repo
2. Add opportunities to `data/opportunities.json`
3. Open a Pull Request

Or use the [GitHub Issues template](.github/ISSUE_TEMPLATE/submit-opportunity.md) to submit without touching code.

---

## 📄 License

MIT — free to use, modify, and distribute.

---

*Made with ❤️ in Bangladesh · [nexteca.club](https://nexteca.club) · [Facebook Community](https://facebook.com/groups/nexteca)*

# nextECA — Complete Setup Guide
## Submissions → Email + GitHub Issues + Telegram

This guide gets all three notification channels working in **under 30 minutes**.

---

## Overview: How a Submission Flows

```
User fills form on nextECA.club
        ↓
Netlify Function fires (submit-opportunity.js)
        ↓ (all three in parallel)
┌───────────────┬──────────────────┬─────────────────┐
│  📧 Email     │  📋 GitHub Issue │  💬 Telegram    │
│  via Resend   │  auto-created    │  bot message    │
│  (free)       │  with JSON ready │  to your group  │
└───────────────┴──────────────────┴─────────────────┘
        ↓
Team reviews GitHub Issue
        ↓
Team member adds "approved" label
        ↓
GitHub Actions auto-adds to opportunities.json
        ↓
Netlify deploys in ~60 seconds
        ↓
Opportunity is LIVE on nexteca.club ✅
```

---

## Step 1 — Deploy to Netlify (5 min)

1. Push your repo to GitHub (if not already)
2. Go to **[netlify.com](https://netlify.com)** → Log in → **Add new site → Import from Git**
3. Choose your GitHub repo
4. Settings:
   - **Branch:** `main`
   - **Build command:** *(leave blank)*
   - **Publish directory:** `.`
5. Click **Deploy site**

Your site is now live. Note your **Site ID** from:
`Site Settings → General → Site Information → Site ID`

---

## Step 2 — Email via Resend (5 min)

Resend is free (3,000 emails/month), reliable, and takes 2 minutes to set up.

### 2a. Create Resend account
1. Go to **[resend.com](https://resend.com)** → Sign up free
2. Click **API Keys → Create API Key**
3. Name it `nextECA`, set permission to **Sending access**
4. Copy the key (starts with `re_...`)

### 2b. Verify your domain (for `hello@nexteca.club`)
1. In Resend → **Domains → Add Domain → `nexteca.club`**
2. Add the DNS records Resend shows you in your domain registrar (Namecheap/GoDaddy etc.)
3. Wait ~5 min for verification (usually instant)

> ⚡ **Shortcut while testing:** Use `onboarding@resend.dev` as the sender — works instantly without domain setup. Change to `submissions@nexteca.club` later.

### 2c. Add to Netlify
1. Netlify Dashboard → Your Site → **Site Configuration → Environment Variables**
2. Add variable:
   ```
   Key:   RESEND_API_KEY
   Value: re_your_key_here
   ```

---

## Step 3 — GitHub Issues Auto-creation (5 min)

### 3a. Create a GitHub Personal Access Token
1. GitHub → **Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Name: `nextECA Submissions`
4. Expiration: 1 year (or No expiration)
5. Scopes: check **`repo`** (includes issues)
6. Click **Generate token** → Copy it

### 3b. Add to Netlify environment variables
```
Key:   GITHUB_TOKEN
Value: ghp_your_token_here

Key:   GITHUB_REPO_OWNER
Value: nextPrtnr          ← your GitHub username/org

Key:   GITHUB_REPO_NAME
Value: nextECA            ← your repo name
```

### 3c. Add labels to your GitHub repo
Go to your repo → **Issues → Labels → New label:**
- Name: `submission`  Color: `#0075ca`
- Name: `needs-review` Color: `#e4e669`
- Name: `approved`    Color: `#0e8a16`
- Name: `published`   Color: `#1d76db`

### 3d. Set up auto-deploy on approval
1. Go to repo → **Settings → Secrets and Variables → Actions → New repository secret:**
   ```
   NETLIFY_AUTH_TOKEN  → from Netlify: User Settings → Personal Access Tokens
   NETLIFY_SITE_ID     → from Netlify: Site Settings → General → Site ID
   ```

---

## Step 4 — Telegram Notifications (10 min)

### 4a. Create your Telegram Bot
1. Open Telegram → search **@BotFather**
2. Send `/newbot`
3. Name your bot: `nextECA Alerts`
4. Username: `nextECA_alerts_bot` (must be unique, add random numbers if taken)
5. BotFather gives you a token like: `7123456789:AABBCCxxxx...`
6. Copy it — this is your `TELEGRAM_BOT_TOKEN`

### 4b. Create a Telegram Group for your team
1. Create a new Telegram group: **nextECA Team**
2. Add your bot to the group (search its username → Add to Group)
3. Add your team members (2-3 people)
4. **Make the bot an admin** (so it can post messages):
   Group → Edit → Administrators → Add Administrator → your bot

### 4c. Get your Chat ID
**Method 1 (easiest):**
1. Add **@userinfobot** to your group temporarily
2. It will post the group's Chat ID (a negative number like `-1001234567890`)
3. Remove @userinfobot after

**Method 2:**
1. Send a message in your group
2. Open this URL in browser (replace TOKEN):
   `https://api.telegram.org/botYOUR_TOKEN/getUpdates`
3. Find `"chat":{"id":` in the response — that's your Chat ID

### 4d. Add to Netlify environment variables
```
Key:   TELEGRAM_BOT_TOKEN
Value: 7123456789:AABBCCxxxx...

Key:   TELEGRAM_CHAT_ID
Value: -1001234567890
```

### 4e. Add Telegram secrets to GitHub too (for deploy notifications)
Repo → **Settings → Secrets → Actions:**
```
TELEGRAM_BOT_TOKEN  → same token
TELEGRAM_CHAT_ID    → same chat ID
```

---

## Step 5 — Trigger a Redeploy

After adding all environment variables:
1. Netlify Dashboard → **Deploys → Trigger deploy → Deploy site**
2. Wait ~60 seconds
3. Test by submitting a form on your site

---

## Step 6 — How to Approve a Submission (Team Workflow)

When someone submits an opportunity:

1. **You get:** Email + Telegram message + GitHub Issue (all automatic)
2. **Go to:** GitHub repo → Issues
3. **Review** the submission (check official link, verify deadline, read description)
4. If good → **add the `approved` label** to the issue
5. **GitHub Actions automatically:**
   - Adds the JSON to `data/opportunities.json`
   - Commits and pushes to main
   - Netlify deploys in ~60 seconds
   - Comments on the issue and closes it
6. **Done** — opportunity is live on nexteca.club ✅

If rejected → just close the issue without adding `approved` label. Optionally comment why.

---

## Environment Variables Summary

Set all of these in **Netlify → Site Configuration → Environment Variables:**

| Variable | Where to get it | Required for |
|----------|----------------|--------------|
| `RESEND_API_KEY` | resend.com → API Keys | Email notifications |
| `GITHUB_TOKEN` | GitHub → Settings → PAT | GitHub Issue creation |
| `GITHUB_REPO_OWNER` | Your GitHub username | GitHub Issue creation |
| `GITHUB_REPO_NAME` | Your repo name | GitHub Issue creation |
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram | Telegram notifications |
| `TELEGRAM_CHAT_ID` | Your group chat ID | Telegram notifications |

Set these in **GitHub → Settings → Secrets → Actions:**

| Secret | Where to get it | Required for |
|--------|----------------|--------------|
| `NETLIFY_AUTH_TOKEN` | Netlify → User Settings → PAT | Auto-deploy |
| `NETLIFY_SITE_ID` | Netlify → Site Settings → General | Auto-deploy |
| `TELEGRAM_BOT_TOKEN` | Same as above | Deploy notifications |
| `TELEGRAM_CHAT_ID` | Same as above | Deploy notifications |

---

## Testing Each Channel

### Test Email
```
Go to nexteca.club/submit (or #/submit)
Fill in a test submission → Submit
Check hello@nexteca.club inbox (also check spam first time)
```

### Test GitHub Issue
```
Same submission → check your GitHub repo → Issues tab
Should see a new issue with [Submission] tag and the JSON block
```

### Test Telegram
```
Same submission → check your Telegram group
Should see a formatted message with all details
```

### Test Auto-publish
```
On a test GitHub Issue → add the "approved" label
Wait 60-90 seconds → check Actions tab for the workflow run
Check data/opportunities.json — new entry should be there
Check your site — should appear live
```

---

## Troubleshooting

**Email not arriving?**
- Check spam folder
- Verify your domain in Resend dashboard
- Check Netlify Function logs: Netlify → Functions → submit-opportunity → View logs

**GitHub Issue not created?**
- Check your PAT has `repo` scope
- Verify `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` are exact (case-sensitive)
- Check Netlify Function logs for error message

**Telegram not working?**
- Make the bot an admin in your group
- Double-check the Chat ID (group IDs are negative numbers)
- Test bot token: `https://api.telegram.org/botYOUR_TOKEN/getMe`

**Auto-publish not firing?**
- Make sure the `approved` label name is exactly `approved` (lowercase)
- Check Actions tab for workflow run errors
- Verify GitHub secrets are set correctly

---

## Monthly Cost: $0

| Service | Free Tier | nextECA usage |
|---------|-----------|---------------|
| Netlify | 100GB bandwidth, 300 build min | Way under |
| Netlify Functions | 125,000 requests/month | Way under |
| Resend | 3,000 emails/month | Way under |
| GitHub | Unlimited public repos | Free |
| Telegram | Free | Free |

**Total: $0/month forever** on free tiers.

---

*Questions? Email hello@nexteca.club or open a GitHub Discussion.*

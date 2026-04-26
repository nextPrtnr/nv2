/**
 * nextECA — Opportunity Submission Handler
 * Netlify Serverless Function
 *
 * This function fires when someone submits the opportunity form.
 * It does THREE things in parallel:
 *   1. Sends an email to hello@nexteca.club (via Resend — free tier)
 *   2. Creates a GitHub Issue on the repo (for team review + audit trail)
 *   3. Sends a Telegram message to your group/channel
 *
 * Environment variables needed (set in Netlify Dashboard → Site → Environment):
 *   RESEND_API_KEY          — from resend.com (free, 3000 emails/month)
 *   GITHUB_TOKEN            — Personal Access Token with repo + issues scope
 *   GITHUB_REPO_OWNER       — e.g. "nextPrtnr"
 *   GITHUB_REPO_NAME        — e.g. "nextECA"
 *   TELEGRAM_BOT_TOKEN      — from @BotFather on Telegram
 *   TELEGRAM_CHAT_ID        — your group or channel chat ID
 */

const NOTIFY_EMAIL = 'hello@nexteca.club';

// ─── HELPERS ────────────────────────────────────────────────────────────────
function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

function validateFields(data) {
  const required = ['title', 'category', 'org', 'deadline', 'link', 'description'];
  const missing = required.filter(f => !data[f] || !data[f].trim());
  return missing;
}

function formatDate(str) {
  if (!str) return 'N/A';
  try {
    return new Date(str).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return str; }
}

function daysUntil(str) {
  if (!str) return '?';
  const diff = Math.round((new Date(str) - new Date()) / 86400000);
  if (diff < 0) return 'Already passed!';
  if (diff === 0) return 'Today!';
  return `${diff} days`;
}

// ─── 1. EMAIL via Resend ─────────────────────────────────────────────────────
async function sendEmail(data) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn('RESEND_API_KEY not set — skipping email'); return null; }

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#f7f8fa; margin:0; padding:20px; }
  .card { background:#fff; border-radius:12px; padding:28px; max-width:560px; margin:0 auto; border:1px solid #e1e4ea; }
  .logo { font-size:22px; font-weight:800; color:#0052CC; margin-bottom:20px; }
  .logo span { color:#172B4D; }
  h2 { font-size:20px; color:#172B4D; margin-bottom:16px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:4px; font-size:12px; font-weight:700; background:#E9F2FF; color:#0052CC; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; }
  td { padding:10px 12px; border-bottom:1px solid #f0f0f0; font-size:14px; }
  td:first-child { color:#8993A4; font-weight:600; width:38%; }
  td:last-child { color:#172B4D; font-weight:500; }
  .desc-box { background:#f7f8fa; border-radius:8px; padding:14px; font-size:14px; color:#44546F; line-height:1.6; margin-bottom:20px; }
  .btn { display:inline-block; padding:11px 22px; background:#0052CC; color:#fff; border-radius:7px; font-weight:700; font-size:14px; text-decoration:none; margin-right:8px; }
  .btn-ghost { background:#f7f8fa; color:#0052CC; border:1px solid #0052CC; }
  .footer { font-size:12px; color:#8993A4; margin-top:20px; padding-top:16px; border-top:1px solid #f0f0f0; }
  .urgent { color:#BF2600; font-weight:700; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">next<span>ECA</span> 🚀</div>
  <h2>New Opportunity Submission</h2>
  <span class="badge">📋 Needs Review</span>

  <table>
    <tr><td>Title</td><td><strong>${data.title || '—'}</strong></td></tr>
    <tr><td>Category</td><td>${data.category || '—'}</td></tr>
    <tr><td>Organization</td><td>${data.org || '—'}</td></tr>
    <tr><td>Deadline</td><td class="${daysUntil(data.deadline) === 'Already passed!' ? 'urgent' : ''}">${formatDate(data.deadline)} (${daysUntil(data.deadline)})</td></tr>
    <tr><td>Mode</td><td>${data.mode || '—'}</td></tr>
    <tr><td>Location</td><td>${data.location || '—'}</td></tr>
    <tr><td>Prize</td><td>${data.prize || '—'}</td></tr>
    <tr><td>Official Link</td><td><a href="${data.link || '#'}">${data.link || '—'}</a></td></tr>
    <tr><td>Submitted by</td><td>${data.submitter_name || 'Anonymous'}${data.submitter_email ? ` &lt;${data.submitter_email}&gt;` : ''}</td></tr>
  </table>

  <strong style="font-size:13px;color:#44546F;display:block;margin-bottom:8px">Description:</strong>
  <div class="desc-box">${data.description || '—'}</div>

  ${data.eligibility ? `<strong style="font-size:13px;color:#44546F;display:block;margin-bottom:8px">Eligibility:</strong><div class="desc-box">${data.eligibility}</div>` : ''}

  <a href="${process.env.URL || 'https://nexteca.club'}/data/opportunities.json" class="btn">Add to Site →</a>
  <a href="https://github.com/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/issues" class="btn btn-ghost">View GitHub Issues</a>

  <div class="footer">
    Submitted via nextECA.club · Reply to ${data.submitter_email || 'anonymous'} to follow up.
  </div>
</div>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'nextECA Submissions <submissions@nexteca.club>',
      to: [NOTIFY_EMAIL],
      reply_to: data.submitter_email || NOTIFY_EMAIL,
      subject: `[nextECA] New Submission: ${data.title}`,
      html,
    }),
  });

  const result = await res.json();
  console.log('Email result:', result);
  return result;
}

// ─── 2. GITHUB ISSUE ─────────────────────────────────────────────────────────
async function createGitHubIssue(data) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo  = process.env.GITHUB_REPO_NAME;
  if (!token || !owner || !repo) { console.warn('GitHub env vars not set — skipping issue'); return null; }

  // Build the JSON snippet they can copy-paste directly
  const jsonSnippet = JSON.stringify({
    id: data.title
      ? data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
      : 'new-opportunity',
    title: data.title || '',
    org: data.org || '',
    logo: '🏆',
    category: data.category || '',
    tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    location: data.location || 'Global',
    mode: data.mode || 'online',
    deadline: data.deadline || '',
    prize: data.prize || '',
    prizeAmount: data.prize || '',
    featured: false,
    description: data.description || '',
    eligibility: data.eligibility || '',
    link: data.link || '',
    tips: '',
    country: '',
    level: 'international',
  }, null, 2);

  const body = `
## 📋 Submission Details

| Field | Value |
|-------|-------|
| **Title** | ${data.title || '—'} |
| **Category** | ${data.category || '—'} |
| **Organization** | ${data.org || '—'} |
| **Deadline** | ${formatDate(data.deadline)} (${daysUntil(data.deadline)}) |
| **Mode** | ${data.mode || '—'} |
| **Location** | ${data.location || '—'} |
| **Prize** | ${data.prize || '—'} |
| **Official Link** | ${data.link ? `[${data.link}](${data.link})` : '—'} |
| **Submitted by** | ${data.submitter_name || 'Anonymous'} ${data.submitter_email ? `(${data.submitter_email})` : ''} |

### Description
${data.description || '—'}

### Eligibility
${data.eligibility || '—'}

### Tags
${data.tags || '—'}

---

## ✅ Team Checklist
- [ ] Verified legitimate (checked official link)
- [ ] Deadline is in the future
- [ ] Description is accurate and complete
- [ ] Approved — ready to add to site

## 🚀 Copy-Paste JSON (add to \`data/opportunities.json\`)

\`\`\`json
${jsonSnippet}
\`\`\`

---
*Submitted via nextECA.club submission form*
`;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[Submission] ${data.title || 'New Opportunity'}`,
        body,
        labels: ['submission', 'needs-review'],
      }),
    }
  );

  const result = await res.json();
  console.log('GitHub Issue:', result.html_url || result);
  return result;
}

// ─── 3. TELEGRAM ─────────────────────────────────────────────────────────────
async function sendTelegram(data, issueUrl) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.warn('Telegram env vars not set — skipping'); return null; }

  const urgency = daysUntil(data.deadline);
  const isUrgent = typeof urgency === 'string' && urgency.includes('day') && parseInt(urgency) <= 14;

  const msg = `
${isUrgent ? '🚨' : '📬'} *New Opportunity Submission*

*${escTG(data.title || 'Untitled')}*
🏛 ${escTG(data.org || '—')} · ${escTG(data.category || '—')}
📍 ${escTG(data.location || '—')} · ${escTG(data.mode || '—')}
🗓 Deadline: *${formatDate(data.deadline)}* (${urgency})
🏅 Prize: ${escTG(data.prize || '—')}

🔗 [Official Link](${data.link || '#'})
${issueUrl ? `📋 [Review on GitHub](${issueUrl})` : ''}

_Submitted by: ${escTG(data.submitter_name || 'Anonymous')}_
`.trim();

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    }
  );

  const result = await res.json();
  console.log('Telegram result:', result.ok);
  return result;
}

function escTG(str) {
  return String(str).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
exports.handler = async function (event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return respond(200, {});
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  // Parse body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  // Validate required fields
  const missing = validateFields(data);
  if (missing.length > 0) {
    return respond(422, {
      error: 'Missing required fields',
      fields: missing,
    });
  }

  // Spam / bot check
  if (data.bot_field) {
    return respond(200, { ok: true, note: 'Bot detected — discarded silently' });
  }

  console.log('Processing submission:', data.title);

  // Fire all three in parallel — don't let one failure block others
  const [emailResult, issueResult, telegramResult] = await Promise.allSettled([
    sendEmail(data),
    createGitHubIssue(data),
    Promise.resolve(null), // Telegram needs issue URL, so runs after
  ]);

  // Get GitHub issue URL for Telegram message
  const issueUrl = issueResult.status === 'fulfilled' && issueResult.value?.html_url
    ? issueResult.value.html_url
    : null;

  // Now send Telegram with issue URL included
  const tgResult = await sendTelegram(data, issueUrl).catch(e => {
    console.error('Telegram error:', e);
    return null;
  });

  const response = {
    ok: true,
    title: data.title,
    channels: {
      email:    emailResult.status === 'fulfilled' ? 'sent' : 'failed',
      github:   issueResult.status === 'fulfilled' && issueResult.value?.html_url ? issueResult.value.html_url : 'failed',
      telegram: tgResult?.ok ? 'sent' : 'failed',
    },
  };

  console.log('Submission complete:', response);
  return respond(200, response);
};

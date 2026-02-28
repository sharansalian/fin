import PDFDocument from 'pdfkit';
import fs from 'fs';

const FONT_REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
const FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const FONT_ITALIC = '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf';
const FONT_MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf';

const ACCENT = '#EF4056';
const DARK = '#0A0A0F';
const MID = '#444444';
const LIGHT_BG = '#F6F6F8';
const TABLE_HEADER_BG = '#1a1a2e';
const TABLE_HEADER_FG = '#ffffff';
const TABLE_ALT_BG = '#f0f0f5';

const output = '/home/user/pocket/Pocket_Business_Analysis.pdf';

const doc = new PDFDocument({
  size: 'A4',
  bufferPages: true,
  margins: { top: 60, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'Pocket — Business Analysis & Growth Strategy',
    Author: 'Pocket Team',
    Subject: 'Infrastructure, Pricing, Marketing, and Profitability',
  },
});

const stream = fs.createWriteStream(output);
doc.pipe(stream);

doc.registerFont('Regular', FONT_REG);
doc.registerFont('Bold', FONT_BOLD);
doc.registerFont('Italic', FONT_ITALIC);
doc.registerFont('Mono', FONT_MONO);

const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
let y;

function getY() { return doc.y; }
function setY(val) { doc.y = val; }
function ensureSpace(needed) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom - 20) {
    doc.addPage();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function title(text) {
  ensureSpace(80);
  doc.font('Bold').fontSize(28).fillColor(ACCENT).text(text, { align: 'left' });
  doc.moveDown(0.3);
  doc.moveTo(doc.x, doc.y).lineTo(doc.x + W, doc.y).lineWidth(2).strokeColor(ACCENT).stroke();
  doc.moveDown(0.8);
}

function h2(text) {
  ensureSpace(40);
  doc.moveDown(0.5);
  doc.font('Bold').fontSize(16).fillColor(DARK).text(text);
  doc.moveDown(0.3);
}

function h3(text) {
  ensureSpace(30);
  doc.moveDown(0.3);
  doc.font('Bold').fontSize(12).fillColor(MID).text(text);
  doc.moveDown(0.2);
}

function para(text) {
  doc.font('Regular').fontSize(10).fillColor(DARK).text(text, { lineGap: 3 });
  doc.moveDown(0.3);
}

function bullet(text, indent = 15) {
  ensureSpace(15);
  const x = doc.page.margins.left + indent;
  doc.font('Regular').fontSize(10).fillColor(MID);
  doc.text('•', x - 12, doc.y, { continued: false });
  doc.text(text, x, doc.y - doc.currentLineHeight(), { width: W - indent, lineGap: 2 });
  doc.moveDown(0.15);
}

function numberedItem(num, text, indent = 15) {
  ensureSpace(15);
  const x = doc.page.margins.left + indent;
  doc.font('Bold').fontSize(10).fillColor(ACCENT).text(`${num}.`, x - 18, doc.y);
  doc.font('Regular').fontSize(10).fillColor(DARK);
  doc.text(text, x, doc.y - doc.currentLineHeight(), { width: W - indent, lineGap: 2 });
  doc.moveDown(0.15);
}

function table(headers, rows, colWidths) {
  const rowHeight = 22;
  const totalNeeded = (rows.length + 1) * rowHeight + 10;
  ensureSpace(Math.min(totalNeeded, 200));

  const startX = doc.page.margins.left;
  let curY = doc.y;

  // Header row
  doc.rect(startX, curY, W, rowHeight).fill(TABLE_HEADER_BG);
  let cx = startX;
  headers.forEach((h, i) => {
    const cw = colWidths[i];
    doc.font('Bold').fontSize(8.5).fillColor(TABLE_HEADER_FG);
    doc.text(h, cx + 5, curY + 6, { width: cw - 10, align: 'left' });
    cx += cw;
  });
  curY += rowHeight;

  // Data rows
  rows.forEach((row, ri) => {
    ensureSpace(rowHeight + 5);
    curY = doc.y;
    if (ri % 2 === 0) {
      doc.rect(startX, curY, W, rowHeight).fill(TABLE_ALT_BG);
    }
    cx = startX;
    row.forEach((cell, ci) => {
      const cw = colWidths[ci];
      doc.font('Regular').fontSize(8.5).fillColor(DARK);
      doc.text(String(cell), cx + 5, curY + 6, { width: cw - 10, align: 'left' });
      cx += cw;
    });
    doc.y = curY + rowHeight;
  });
  doc.moveDown(0.5);
}

// ── COVER PAGE ───────────────────────────────────────────────────────────

doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK);

doc.font('Bold').fontSize(42).fillColor('#ffffff');
doc.text('Pocket', doc.page.margins.left, 200, { align: 'left' });
doc.font('Regular').fontSize(42).fillColor(ACCENT);
doc.text('Business Analysis', { align: 'left' });

doc.moveDown(1);
doc.font('Regular').fontSize(14).fillColor('#aaaaaa');
doc.text('Infrastructure Cost • Competitive Pricing • Marketing Strategy • Path to Profitability', {
  width: W,
  lineGap: 4,
});

doc.moveDown(4);
doc.font('Regular').fontSize(11).fillColor('#666666');
doc.text('February 2026', { align: 'left' });
doc.text('Confidential', { align: 'left' });

// ── PAGE 2: CURRENT COST ────────────────────────────────────────────────

doc.addPage();

title('Current Infrastructure Cost');

para('At your current scale (0-100 users), everything fits within free tiers. Your total monthly cost is $0.');

h2('Firebase & API Free Tier Usage');

table(
  ['Service', 'Free Tier', 'Your Usage', 'Cost'],
  [
    ['Firebase Auth', '50k MAU', '~5 users', '$0'],
    ['Firestore reads', '50k/day (1.5M/mo)', '~1k/day', '$0'],
    ['Firestore writes', '20k/day (600k/mo)', '~100/day', '$0'],
    ['Firestore storage', '1 GiB', '~50 MB', '$0'],
    ['Cloud Functions (v2)', '180k vCPU-sec/mo', '~200 calls/mo', '$0'],
    ['Groq API (AI summaries)', '~1,000 req/day', '~5/day', '$0'],
    ['HuggingFace (Kokoro TTS)', 'Credit-based', '~2/day', '$0'],
    ['Firebase Hosting', '10 GB + 360 MB/day', '~500 MB total', '$0'],
    ['GitHub Actions', '2,000 min/month', '~30 min/month', '$0'],
  ],
  [W * 0.30, W * 0.28, W * 0.22, W * 0.20]
);

h2('Per-User Unit Economics');

para('Firebase charges $0.18 per 100k reads, $0.18 per 100k writes, $0.0000240/vCPU-second, $0.0000025/GiB-second. For an average active user per month (saves 20 articles, reads 10, summarizes 5, uses TTS twice):');

table(
  ['Operation', 'Usage', 'Cost'],
  [
    ['fetchArticle (5s avg, 512MiB)', '20 calls', '$0.0007'],
    ['summarizeArticle (10s avg, 512MiB)', '5 calls', '$0.0004'],
    ['readArticle TTS (30s avg, 512MiB)', '2 calls', '$0.0004'],
    ['Firestore reads (~30/session)', '300 reads', '$0.0005'],
    ['Firestore writes', '50 writes', '$0.0001'],
    ['Total per active user/month', '', '$0.002'],
  ],
  [W * 0.45, W * 0.25, W * 0.30]
);

para('Per-user infrastructure cost is under half a penny per month. Infrastructure will not be a scaling concern.');

h2('Scaling Bottleneck: AI API Limits');

para('Firebase will not be the problem. Free AI APIs will break first:');

table(
  ['API', 'Free Limit', 'Breaks At'],
  [
    ['Groq (AI summaries)', '~1,000 req/day', '~200 DAU (5 summaries/user/day)'],
    ['HuggingFace Kokoro TTS', '~100-200 calls/day', '~50-100 DAU (2 TTS/user/day)'],
  ],
  [W * 0.30, W * 0.35, W * 0.35]
);

para('Paid API costs when free tier runs out:');
bullet('Groq paid: ~$0.0007/summary ($0.20/M input tokens) — negligible');
bullet('HuggingFace Pro: $9/month for 20x credits');
bullet('Alternative: Self-host Kokoro on a $5/mo GPU VPS once you reach ~500 users');

// ── PAGE 3: COMPETITIVE PRICING ─────────────────────────────────────────

doc.addPage();

title('Competitive Pricing Landscape');

para('Two major competitors (Pocket and Omnivore) shut down in 2024-2025, creating a significant market gap:');

table(
  ['App', 'Status', 'Free Tier', 'Premium Price'],
  [
    ['Pocket (Mozilla)', 'Dead (July 2025)', 'N/A', 'N/A'],
    ['Omnivore', 'Dead (Nov 2024)', 'N/A', 'N/A'],
    ['Instapaper', 'Active', 'Yes', '$6/mo or $50/yr'],
    ['Raindrop.io', 'Active', 'Yes', '$3/mo or $28/yr'],
    ['Matter', 'Active', 'Limited', '$80/yr (~$6.67/mo)'],
    ['Readwise Reader', 'Active', 'No', '~$8-10/mo'],
    ['Your Pocket', 'Active', 'Yes', '?'],
  ],
  [W * 0.22, W * 0.22, W * 0.18, W * 0.38]
);

h2('Recommended Price Point: $3.99/month');

para('Why $3.99, not $4.99: the psychological difference between $3.99 and $4.99 drives 15-25% higher conversion. At this stage, volume matters more than per-subscriber revenue.');

h3('Suggested Pricing Tiers');

table(
  ['Plan', 'Price', 'Positioning'],
  [
    ['Free', '$0', '500 articles, browser TTS, basic search, tags'],
    ['Premium Monthly', '$3.99/mo', 'AI TTS, AI summaries, full-text search, unlimited saves'],
    ['Premium Annual', '$29.99/yr ($2.50/mo)', 'Same features — 37% discount drives annual lock-in'],
  ],
  [W * 0.20, W * 0.25, W * 0.55]
);

h3('Why This Works');
bullet('Cheaper than every active competitor except Raindrop ($3), which is bookmarks not read-later');
bullet('Annual plan at $29.99 is under $30 — feels like one purchase, not ongoing cost');
bullet('37% annual discount is strong enough to push most subscribers to annual (better retention)');
bullet('AI features (TTS + summaries) justify premium vs pure read-later apps');

h2('Lemon Squeezy Fee Impact (India Merchant)');

para('Lemon Squeezy charges 5% + $0.50 base + 1.5% international surcharge for non-US merchants:');

table(
  ['', 'Monthly ($3.99)', 'Annual ($29.99)'],
  [
    ['Base fee (5% + $0.50)', '$0.70', '$2.00'],
    ['International (+1.5%)', '$0.06', '$0.45'],
    ['Total LS fee', '$0.76', '$2.45'],
    ['You keep (net)', '$3.23', '$27.54'],
    ['Effective per month', '$3.23/mo', '$2.30/mo'],
  ],
  [W * 0.35, W * 0.325, W * 0.325]
);

para('Annual plan = better unit economics. Monthly nets you $3.23, but annual has 2-3x better retention and gives you cash upfront.');

// ── PAGE 4: MARKETING ──────────────────────────────────────────────────

doc.addPage();

title('Marketing Strategy');

h2('Phase 1 — Free Distribution (Month 1-3)');

para('Core positioning: "Pocket is dead. Here\'s what comes next." Position as the open, free alternative to Mozilla Pocket. Cost: $0.');

numberedItem(1, 'Reddit — Post in r/productivity, r/readlater, r/webdev, r/selfhosted. Target r/getpocket (12k members searching for alternatives).');
numberedItem(2, 'Hacker News — "Show HN: Open-source read-later app with AI summaries"');
numberedItem(3, 'Product Hunt — Free launch, one-time effort. "Pocket replacement with AI TTS"');
numberedItem(4, 'Twitter/X — Thread: "Mozilla killed Pocket. I rebuilt it with AI. Here\'s what I learned."');
numberedItem(5, 'Dev.to / Hashnode — Technical blog about the stack (LangGraph, Firebase, Kokoro)');
numberedItem(6, 'SEO landing page — Target "pocket alternative", "read later app", "save articles"');

h2('Phase 2 — Growth Hooks (Month 2-4)');

numberedItem(1, 'Share links with OG previews (already built) — every shared article is free marketing');
numberedItem(2, '"Saved with Pocket" watermark on share cards — brand awareness');
numberedItem(3, 'Import from Pocket (already built) — the #1 conversion driver for ex-Pocket users');
numberedItem(4, 'Chrome extension (already built) — submit to Web Store, free distribution');
numberedItem(5, 'Referral: "Invite a friend, get 1 month Premium free"');

h2('Phase 3 — Paid (Only After Product-Market Fit)');

bullet('Google Ads on "pocket alternative" (~$0.50 CPC, low volume but high intent)');
bullet('Newsletter sponsorships (Dense Discovery, Superhuman — $100-300/issue)');

// ── PAGE 5: FEATURES ────────────────────────────────────────────────────

doc.addPage();

title('Feature Analysis');

h2('Built & Working');

table(
  ['Feature', 'Status', 'Notes'],
  [
    ['Save articles (URL + manual)', 'Complete', 'AddArticleModal, SaveHandler, share target'],
    ['Server-side fetch + parse', 'Complete', 'Cloud Function, Readability, sanitize-html'],
    ['Clean reader mode', 'Complete', '5 fonts, 3 sizes, full typography controls'],
    ['Archive / Favorites', 'Complete', 'Toggle + dedicated pages'],
    ['Tags & search', 'Complete', 'Flat tags, client-side title/domain filter'],
    ['Batch import (Pocket CSV)', 'Complete', 'ImportModal, 499-batch Firestore writes'],
    ['Social sharing + short links', 'Complete', 'ShareModal, /p/{code}, OG meta tags'],
    ['Featured article (most-liked)', 'Complete', 'onArticleFavoriteChange + articleStats'],
    ['AI Summary (Groq + LangGraph)', 'Complete', 'Key points + suggested tags'],
    ['AI TTS (Kokoro via HuggingFace)', 'Complete', 'Premium-gated, base64 chunk playback'],
    ['Browser TTS', 'Complete', 'SpeechSynthesis, 12 voices ranked by quality'],
    ['YouTube embed player', 'Complete', 'VideoPlayer + transcript extraction'],
    ['PWA (installable)', 'Complete', 'manifest, sw.js, InstallBanner'],
    ['Dark mode', 'Complete', 'ThemeContext with toggle in settings'],
    ['Chrome extension', 'Complete', 'MV3, popup with sign-in + one-click save'],
    ['React Native app', 'Scaffolded', 'Expo + EAS, basic tabs, needs polish'],
    ['Payment (Lemon Squeezy)', 'Backend done', 'Cloud Functions ready, needs LS setup'],
  ],
  [W * 0.32, W * 0.15, W * 0.53]
);

h2('Not Built — Premium Differentiators Needed');

table(
  ['Feature', 'Priority', 'Impact', 'Effort'],
  [
    ['Full-text search', 'High', 'Top premium feature people pay for', 'Medium (Algolia)'],
    ['Highlights & annotations', 'Medium', 'Power-user feature, high retention', 'High'],
    ['Nested tags / collections', 'Medium', 'Organization power users want', 'Medium'],
    ['Offline reading (IndexedDB)', 'High', 'Killer feature for commuters', 'Medium'],
    ['Reading streaks / stats', 'Medium', 'Gamification drives daily use', 'Low'],
    ['Reading progress tracking', 'Medium', 'Resume where you left off', 'Low'],
    ['Email-to-Pocket ingestion', 'Low', 'Niche but listed in premium', 'Medium'],
  ],
  [W * 0.28, W * 0.12, W * 0.35, W * 0.25]
);

// ── PAGE 6: PROJECTIONS ─────────────────────────────────────────────────

doc.addPage();

title('Path to Profitability');

h2('Assumptions');

bullet('3% free-to-paid conversion (industry standard for freemium SaaS)');
bullet('60% monthly / 40% annual split, shifting to 40/60 by month 12');
bullet('5% monthly churn on monthly subs, 15% annual churn');
bullet('$0.01/user/month infrastructure cost (generous padding)');
bullet('Organic growth via Reddit/HN/Product Hunt launches');

h2('Growth Projections');

table(
  ['Month', 'MAU', 'Premium Users', 'MRR (net)', 'Infra Cost', 'Net Profit'],
  [
    ['1', '50', '2', '$6', '$0', '$6'],
    ['3', '300', '9', '$29', '$0', '$29'],
    ['6', '1,500', '45', '$145', '$2', '$143'],
    ['9', '4,000', '120', '$387', '$8', '$379'],
    ['12', '8,000', '240', '$774', '$20', '$754'],
    ['18', '15,000', '450', '$1,451', '$50', '$1,401'],
    ['24', '30,000', '900', '$2,903', '$120', '$2,783'],
  ],
  [W * 0.10, W * 0.14, W * 0.18, W * 0.18, W * 0.18, W * 0.22]
);

h2('Key Milestones');

table(
  ['Milestone', 'When', 'What Changes'],
  [
    ['$0 profit', 'Day 1', 'Already profitable — no fixed costs'],
    ['Groq free tier exhausted', '~500 DAU', 'Need Groq paid ($5-10/mo) or Gemini free'],
    ['HF free tier exhausted', '~200 DAU', 'Need HF Pro ($9/mo) or self-host Kokoro'],
    ['$100/mo MRR', '~Month 5', 'Covers all paid API costs'],
    ['$500/mo MRR', '~Month 9', 'Side income territory'],
    ['$1,000/mo MRR', '~Month 14', 'Ramen profitable'],
    ['$3,000/mo MRR', '~Month 24', 'Real business'],
  ],
  [W * 0.22, W * 0.18, W * 0.60]
);

h2('What Drives Revenue (Ranked by Impact)');

numberedItem(1, '"Pocket is dead" SEO + content — #1 growth lever. Thousands searching for alternatives right now.');
numberedItem(2, 'AI features as premium differentiator — No other read-later app has built-in TTS + AI summaries. This is your moat.');
numberedItem(3, 'Annual plan push — After Month 3, push annual hard. Lower churn, cash upfront, better unit economics.');
numberedItem(4, 'Browser extension — Already built. Submit to Chrome Web Store. Free distribution, makes saving 10x easier.');

h2('Risk Factors');

bullet('Single-player app — no network effects, users can leave anytime');
bullet('Commoditized space — Instapaper, Raindrop, Wallabag, Readwise exist');
bullet('Free API dependency — Groq and HuggingFace can change limits without notice');
bullet('Differentiation: AI summaries + Kokoro TTS + "Pocket replacement" positioning is the edge');

// ── PAGE 7: ACTION ITEMS ────────────────────────────────────────────────

doc.addPage();

title('Immediate Action Items');

h2('Do This Now');

numberedItem(1, 'Set price at $3.99/mo and $29.99/yr');
numberedItem(2, 'Create Lemon Squeezy account at lemonsqueezy.com and configure product');
numberedItem(3, 'Set VITE_LS_STORE_ID and VITE_LS_VARIANT_ID environment variables');
numberedItem(4, 'Set GitHub secrets: LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_WEBHOOK_SECRET, HF_API_KEY');
numberedItem(5, 'Configure webhook URL in Lemon Squeezy dashboard → your lemonWebhook Cloud Function URL');
numberedItem(6, 'Write "Pocket is dead, here\'s what I built" post → launch on HN + Reddit + Product Hunt');
numberedItem(7, 'Submit Chrome extension to Chrome Web Store (already built, just needs packaging)');

doc.moveDown(2);

// Footer tagline
doc.font('Italic').fontSize(10).fillColor('#999999');
doc.text('You are profitable from subscriber #1. The question is only how fast you grow.', {
  align: 'center',
  width: W,
});

// ── Add page numbers ────────────────────────────────────────────────────

const pageCount = doc.bufferedPageRange().count;
for (let i = 0; i < pageCount; i++) {
  doc.switchToPage(i);
  if (i === 0) continue; // skip cover page
  doc.font('Regular').fontSize(8).fillColor('#999999');
  doc.text(
    `Page ${i} of ${pageCount - 1}`,
    doc.page.margins.left,
    doc.page.height - 35,
    { width: W, align: 'center' }
  );
}

doc.end();

stream.on('finish', () => {
  console.log(`PDF generated: ${output}`);
});

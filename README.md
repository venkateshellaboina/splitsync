# SplitSync

Turn credit card statement CSVs into Splitwise expense splits — fast. Upload one or more statements, assign groups and members, and add expenses in bulk.

All transaction data stays in your browser. Your Splitwise token is stored in `localStorage` only and is **never** committed to this repository.

---

## Prerequisites

- **Node.js 18+**
- **npm**
- A [Splitwise Personal Access Token](https://dev.splitwise.com/) (requires Splitwise Pro for unlimited API usage)

---

## Quick Start

```bash
git clone https://github.com/venkateshellaboina/splitsync.git
cd splitsync
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## First-Time Setup

### 1. Add your Splitwise token

1. Go to the **Configuration** tab.
2. Paste your [Splitwise developer token](https://dev.splitwise.com/).
3. Click **Save**.

The token is stored in your browser's `localStorage` under the key `splitsync_token`. It is sent only to this app's local API routes, which proxy requests to Splitwise.

> **Never** put your token in `.env`, source code, or git. This project has no server-side token storage.

### 2. Verify groups loaded

After saving, groups and members load automatically. Use **Refresh Groups** if needed. You should see your Splitwise groups (e.g. Parksiders) available in the ledger.

---

## Daily Workflow

### Step 1 — Upload a CSV

Click **Upload CSVs** on the **Ledger** tab. You can select one CSV or multiple statements at once from supported banks such as Chase, Amex, Capital One, Apple Card, and Wells Fargo.

The parser auto-detects columns and bank format. You'll see a summary like:

> Loaded 105 transactions from 2 CSVs (Capital One, Wells Fargo) · 12 already synced

Use **New Transaction** to add one-off transactions that are missing from the CSV. Manual transactions appear in the ledger like imported rows and can be assigned, split, ignored, or synced normally.

### Step 2 — Review the ledger

Each row shows:

| Column | Purpose |
|--------|---------|
| **Date** | Card transaction date |
| **Description** | Merchant name from the statement |
| **Amount** | Expense amount |
| **Group** | Splitwise group to charge |
| **Members** | Who to split with |

**Grocery rule:** Configure grocery auto-assignment in the **Configuration** tab. Choose your own Splitwise group, members, and grocery keywords so each user can map groceries to the right household or roommate group.

**Saved rules:** When you sync a transaction, the merchant keyword is remembered for future CSV uploads.

### Step 3 — Customize before syncing

Select a row to reveal extra options:

- **Splitwise description** — Edit the name sent to Splitwise. Default format: `2026-06-05 — MERCHANT NAME`. The card date is in the description only; the expense is **not** backdated (recorded at sync time).
- **Members** — Use **Select all** / **Deselect all** in the members dropdown.
- **Shares** — Set per-person share weights on the active row (e.g. A takes 2, B takes 1). Amounts split proportionally.
- **Reset** — Restore the default Splitwise description.

Rows with a custom description show a blue **Sync:** line under the merchant name. Navigating between assignable rows opens the group selector directly so keyboard review starts at the next decision point.

### Step 4 — Add to Splitwise

**Single row:** Click the send icon on the row, or press **Enter** while the row is selected.

**Bulk add:** Click **Bulk Add (N)** to send all ready rows. The server processes them **one at a time** to avoid rate limits. Rows pulse while adding; successes turn green.

### Step 5 — Handle the rest

- **Ignore** — Click ✕ or press **Delete** to skip a row.
- **Refunds** — Payments and credits appear inline in the ledger with a **Refund** badge (not auto-synced). Click ✕ to ignore them.
- **Show processed items** — Toggle to see already-posted or ignored rows. Use **Edit** (pencil) on posted rows to change group, members, or description and re-send. A **Posted** badge and prior post time stay visible while editing. Use **Restore** on ignored rows to bring them back.

---

## Supported CSV Formats

| Bank | Key columns | Amount logic |
|------|-------------|--------------|
| **Chase** | `Transaction Date`, `Description`, `Amount` | Negative = expense, positive = credit |
| **Chase activity** | `Date`, `Description`, `Amount` (e.g. `activity.csv`) | Positive = expense, negative = credit |
| **Amex** | `Date`, `Description`, `Amount` | Positive = expense, negative = credit |
| **Capital One** | `Transaction Date`, `Description`, `Debit`, `Credit` | Debit = expense, Credit = payment/refund |
| **Apple Card** | `Transaction Date`, `Clearing Date`, `Description`, `Merchant`, `Amount (USD)`, `Purchased By` | Positive = expense, negative = payment/refund |
| **Wells Fargo** | `DATE`, `DESCRIPTION`, `AMOUNT`, `CHECK #`, `STATUS` | Negative = expense, positive = payment/refund |
| **Other** | Auto-detected (`date`, `description`, `amount`, etc.) | Flexible matching |

The parser skips preamble rows (account summaries), finds the real header line automatically, and combines rows when multiple CSVs are selected together.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` / `J` | Next row and open the group selector |
| `↑` / `K` | Previous row and open the group selector |
| `Space` | Open/close group or member selector |
| `Tab` | Switch between group and member selector |
| `Enter` | Sync active row |
| `Delete` / `Backspace` | Ignore active row |

---

## Configuration Tab

| Section | What it does |
|---------|--------------|
| **Splitwise Credentials** | Save token, refresh groups |
| **Synced Transactions** | History of successfully synced items (prevents double-sync on re-upload). **Clear history** resets this. |
| **Automation Rules** | Grocery auto-assignment config plus merchant -> group/member mappings saved from past syncs |

Sync history matches transactions by **date + amount + merchant description**. Grocery settings, saved merchant rules, sync history, and the token all stay local to your browser.

---

## Security & Privacy

| Data | Where it lives |
|------|----------------|
| Credit card transactions | Browser memory only (cleared on refresh) |
| Splitwise token | `localStorage` in your browser |
| Sync history, grocery settings & rules | `localStorage` in your browser |
| Nothing | Server database (none exists) |

API routes (`/api/splitwise/*`) only proxy requests to Splitwise using the token you send from the browser. No secrets are in this codebase.

### Files never committed

`.gitignore` excludes:

- `.env` and `.env.*`
- `node_modules/`
- `.next/`

---

## Scripts

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint
```

---

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Radix UI primitives
- PapaParse (CSV)
- @tanstack/react-virtual (large ledgers)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Loaded 0 transactions** | Check the amber error under the upload button for detected columns. Ensure the CSV has date, description, and amount/debit/credit columns. |
| **Groups not loading** | Verify token in Configuration. Click **Refresh Groups**. |
| **Rate limit errors** | Wait 5 seconds and retry. Bulk sync retries automatically. |
| **Grocery rule not applying** | Open Configuration -> Automation Rules, enable grocery auto-assignment, choose a group and at least one member, then save. Also confirm the transaction description or category contains one of your grocery keywords. |
| **Transaction synced twice** | Sync history should prevent this. Check **Synced Transactions** in Configuration. |

---

## License

Private / personal use.

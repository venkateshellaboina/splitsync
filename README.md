# SplitSync

Turn credit card statement CSVs into Splitwise expense splits — fast. Upload a statement, assign groups and members, and sync in bulk.

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

Click **Upload CSV** on the **Active Ledger** tab. Export a statement from your bank (Chase, Amex, Capital One, etc.).

The parser auto-detects columns and bank format. You'll see a summary like:

> Loaded 105 transactions (Capital One) · 12 already synced

### Step 2 — Review the ledger

Each row shows:

| Column | Purpose |
|--------|---------|
| **Date** | Card transaction date |
| **Description** | Merchant name from the statement |
| **Amount** | Expense amount |
| **Group** | Splitwise group to charge |
| **Members** | Who to split with |

**Built-in rule:** Grocery transactions (Instacart, Costco, etc.) auto-assign to the **Parksiders** group with Venky, Sai Deepak, and Prateek — when that group exists in your Splitwise account.

**Saved rules:** When you sync a transaction, the merchant keyword is remembered for future CSV uploads.

### Step 3 — Customize before syncing

Select a row to reveal extra options:

- **Splitwise description** — Edit the name sent to Splitwise. Default format: `2026-06-05 — MERCHANT NAME`. The card date is in the description only; the expense is **not** backdated (recorded at sync time).
- **Members** — Use **Select all** / **Deselect all** in the members dropdown.
- **Reset** — Restore the default Splitwise description.

Rows with a custom description show a blue **Sync:** line under the merchant name.

### Step 4 — Sync to Splitwise

**Single row:** Click the upload icon on the row, or press **Enter** while the row is selected.

**Bulk sync:** Click **Bulk Sync (N)** to sync all ready rows. The server processes them **one at a time** to avoid rate limits. Rows pulse while syncing; successes turn green.

### Step 5 — Handle the rest

- **Ignore** — Click ✕ or press **Delete** to skip a row.
- **Refunds** — Payments and credits appear on the **Refunds** tab (not auto-synced).
- **Show processed items** — Toggle to see already-synced or ignored rows.

---

## Supported CSV Formats

| Bank | Key columns | Amount logic |
|------|-------------|--------------|
| **Chase** | `Transaction Date`, `Description`, `Amount` | Negative = expense, positive = credit |
| **Amex** | `Date`, `Description`, `Amount` | Positive = expense, negative = credit |
| **Capital One** | `Transaction Date`, `Description`, `Debit`, `Credit` | Debit = expense, Credit = payment/refund |
| **Other** | Auto-detected (`date`, `description`, `amount`, etc.) | Flexible matching |

The parser skips preamble rows (account summaries) and finds the real header line automatically.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` / `J` | Next row |
| `↑` / `K` | Previous row |
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
| **Automation Rules** | Merchant → group/member mappings saved from past syncs |

Sync history matches transactions by **date + amount + merchant description**.

---

## Security & Privacy

| Data | Where it lives |
|------|----------------|
| Credit card transactions | Browser memory only (cleared on refresh) |
| Splitwise token | `localStorage` in your browser |
| Sync history & rules | `localStorage` in your browser |
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
| **Grocery rule not applying** | Ensure a Splitwise group name contains "Parksiders" and members Venky, Sai Deepak, Prateek exist in that group. |
| **Transaction synced twice** | Sync history should prevent this. Check **Synced Transactions** in Configuration. |

---

## License

Private / personal use.

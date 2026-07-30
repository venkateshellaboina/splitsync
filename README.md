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

After saving, groups and members load automatically. Use **Refresh Groups** if needed. You should see your Splitwise groups available in the ledger, including **Non-group expenses** — selecting it lists your Splitwise friends as members, not just yourself (this used to only show yourself; it's now backed by a real friends fetch).

---

## Daily Workflow

### Step 1 — Upload a CSV

Click **Upload CSVs** on the **Ledger** tab. You can select one CSV or multiple statements at once from supported banks such as Chase, Amex, Capital One, Apple Card, Wells Fargo, Discover, and Citi.

The parser auto-detects columns and bank format. You'll see a summary like:

> Loaded 105 transactions from 2 CSVs (Capital One, Wells Fargo) · 12 already synced

Already-uploaded CSVs are remembered by file content (not just filename), so re-uploading the same statement by accident is caught even if it's been renamed. Use **Manage CSVs** to see what's been uploaded and delete a file (and its transactions) if needed.

Use **New Transaction** to add one-off transactions that are missing from the CSV. Manual transactions appear in the ledger like imported rows and can be assigned, split, ignored, or synced normally.

### Step 2 — Review the ledger

Each row shows:

| Column | Purpose |
|--------|---------|
| **Date** | Card transaction date |
| **Description** | Merchant name from the statement |
| **Amount** | Expense amount |
| **Card** | Which uploaded CSV / card the transaction came from (blank for manual entries) |
| **Group** | Splitwise group to charge |
| **Members** | Who to split with |

Use the checkbox next to each row (or **Select all**) to choose which transactions **Bulk Add** should include. Assigning a group and members to a row automatically checks it for you; unchecking a row excludes it from Bulk Add even if it's fully assigned. Assign a group/members to one selected row and it applies to every other selected row at once. Click the **Date**, **Description**, **Amount**, or **Card** column header to sort ascending, click again for descending, and a third click returns to the original order.

**Grocery rule:** Configure grocery auto-assignment in the **Configuration** tab. Choose your own Splitwise group, members, and grocery keywords so each user can map groceries to the right household or roommate group.

**Saved rules:** When you sync a transaction, the merchant keyword is remembered for future CSV uploads.

### Step 3 — Customize before syncing

Select a row to reveal extra options:

- **Splitwise description** — Edit the name sent to Splitwise. Default format: `2026-06-05 — MERCHANT NAME`. The card date is in the description only; the expense is **not** backdated (recorded at sync time).
- **Members** — Use **Select all** / **Deselect all** in the members dropdown.
- **Shares** — Set per-person share weights on the active row (e.g. A takes 2, B takes 1). Amounts split proportionally.
- **Reset** — Restore the default Splitwise description.

Rows with a custom description show a blue **Sync:** line under the merchant name. Navigating between assignable rows with the keyboard opens the group selector directly so keyboard review starts at the next decision point; clicking a row does not auto-open it, so quick clicks stay uninterrupted.

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
| **Discover** | `Trans. Date`, `Post Date`, `Description`, `Amount`, `Category` | Positive = expense, negative = payment/refund |
| **Citi** | `Status`, `Date`, `Description`, `Debit`, `Credit` | Debit = expense, Credit = payment/refund |
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

## Balances Tab

Once you're working with real transactions (not the example ledger), a **Balances** tab appears between Ledger and Configuration. It lists your Splitwise friends and what they owe you or you owe them, with a filter:

| Filter | Shows |
|--------|-------|
| **None** | Every friend; settled-up friends are sorted to the end |
| **Outstanding Balances** (default) | Only friends with a non-zero balance |
| **Friends who owe you** | Only friends who owe you money |
| **Friends you owe** | Only friends you owe money |

An **Overall** total (owed to you minus what you owe) is shown at the top, colored green if positive and red if negative. Click **Refresh** to pull the latest balances from Splitwise. Click the **Name** or **Amount** column header to sort ascending, click again for descending, and a third click returns to the default order.

### Reminders

Friends who owe you money get a checkbox and a **Remind** button. Select one, several, or use the header checkbox to select all, then click **Bulk Remind** — or use the per-row **Remind** button for a single friend.

This opens a preview with an editable message. For a single friend it's fully personalized; for multiple, you edit one shared message (shown with `{{name}}` and `{{amount}}` placeholders, previewed as "XYZ" / "$XX.XX") and each recipient still gets their own separate email with their own real name and amount substituted in — no one ever sees anyone else's balance, and no email is ever sent to more than one person at once. Click **Confirm & Send** to actually send once you've set up Email Reminders below (see Configuration Tab), or use the **Open email draft** link on any row to send manually via your own email app instead.

Once a reminder sends successfully, that friend won't be reminded again for the *same* outstanding balance — they show a **Reminder sent** badge next to their name, with a **Remind again** option if you want to override it, and sink to the bottom of the list (below everyone else, regardless of the active sort or filter) so the people you still need to remind stay at the top. If their balance changes (partial payment, new shared expense), they become remind-eligible again automatically. Failed sends are never recorded, so they're retried next time without you doing anything extra.

**Setup:** in Configuration → Email Reminders, the email address and provider default to whatever's on your Splitwise account (change either if you'd rather send from somewhere else), then generate an app password for that provider:

| Provider | Steps |
|----------|-------|
| **Gmail / Google Workspace** | 1. `myaccount.google.com/security` → turn on 2-Step Verification.<br>2. `myaccount.google.com/apppasswords` → create one (e.g. "SplitSync").<br>3. Copy the 16-character password in. Workspace accounts: your admin must allow app passwords org-wide if the page doesn't appear. |
| **Outlook / Microsoft 365** | 1. `account.microsoft.com/security` → turn on two-step verification.<br>2. Security → "App passwords" → create one.<br>3. Copy it in. |
| **Yahoo Mail** | 1. Yahoo Account Security → turn on two-step verification.<br>2. "Generate app password" → name it → copy it in. |
| **iCloud Mail** | 1. `appleid.apple.com` → Sign-In and Security → App-Specific Passwords.<br>2. Generate one, name it, copy it in. |
| **Custom** | Enter your own SMTP host/port and use whatever credential your provider requires in the App Password field. |

Never enter your real account password — only a scoped, revocable app password. Click **Send test email to myself** to confirm it works before using it on friends. Sent reminders are tracked under **Synced Reminders** in Configuration, with a **Clear history** option.

---

## Configuration Tab

| Section | What it does |
|---------|--------------|
| **Splitwise Credentials** | Save token, refresh groups |
| **Synced Transactions** | History of successfully synced items (prevents double-sync on re-upload). **Clear history** resets this. |
| **Automation Rules** | Grocery auto-assignment config plus merchant -> group/member mappings saved from past syncs |
| **Email Reminders** | Set up the account SplitSync sends balance reminders from (see [Reminders](#reminders)) |
| **Synced Reminders** | History of successfully sent reminders (prevents re-reminding for an unchanged balance). **Clear history** resets this. |

Sync history matches transactions by **date + amount + merchant description**. Reminder history matches by **friend + amount + currency**. Grocery settings, saved merchant rules, sync/reminder history, the token, and the email app password all stay local to your browser.

---

## Security & Privacy

| Data | Where it lives |
|------|----------------|
| Credit card transactions | Browser memory only (cleared on refresh) |
| Splitwise token | `localStorage` in your browser |
| Email app password | `localStorage` in your browser (own key, same as the Splitwise token) |
| Sync/reminder history, grocery settings & rules | `localStorage` in your browser |
| Nothing | Server database (none exists) |

API routes (`/api/splitwise/*`, `/api/reminders/*`) only proxy requests to Splitwise or your email provider using credentials you send from the browser on each request. No secrets are in this codebase, and reminder emails are always sent one recipient at a time — a bulk reminder never lets one friend see another friend's email or balance.

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
- Nodemailer (SMTP email reminders)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Loaded 0 transactions** | Check the amber error under the upload button for detected columns. Ensure the CSV has date, description, and amount/debit/credit columns. |
| **Groups not loading** | Verify token in Configuration. Click **Refresh Groups**. |
| **Rate limit errors** | Wait 5 seconds and retry. Bulk sync retries automatically. |
| **Grocery rule not applying** | Open Configuration -> Automation Rules, enable grocery auto-assignment, choose a group and at least one member, then save. Also confirm the transaction description or category contains one of your grocery keywords. |
| **Transaction synced twice** | Sync history should prevent this. Check **Synced Transactions** in Configuration. |
| **Test email fails to send** | Double-check host/port for your provider and that you're using an app password, not your real account password. Some providers require 2-step verification turned on before app passwords can be created. |

---

## License

Private / personal use.

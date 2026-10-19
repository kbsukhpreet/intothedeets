# Into the Deets

Wedding planning, organized: vendors, conversation history, payments, budget and tasks in one place.

**Stack:** Next.js (website) · Supabase (database and logins) · Vercel (hosting)

## What's in this first version

- **Sign up / log in**, with email confirmation
- **Onboarding:** names, date, budget, location
- **Wedding HQ:** countdown, payments due in the next 90 days, open and overdue tasks, vendor follow-ups, recent conversations
- **Vendors:** a workspace per vendor with contact info, status, contract total, a conversation log, payment schedule, to-dos and notes. Search covers conversation history too ("what did the florist say about candles?")
- **Budget:** contract, paid and remaining per vendor, budget progress, and a payment timeline (past due, next 90 days, later, paid)
- **Tasks:** grouped by overdue, this week, coming up and someday, optionally linked to a vendor
- **Settings:** edit wedding details, and invite your partner with a private link

All data is protected by database security rules: each couple can only see their own wedding.

## One-time setup

### 1. Supabase (database)
1. Open your project → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/schema.sql` and click **Run**.
3. Go to **Authentication → URL Configuration**:
   - **Site URL:** `https://intothedeets.com`
   - **Redirect URLs:** add `https://intothedeets.com/**` and `https://*.vercel.app/**`
4. Go to **Project Settings → API** (or **API Keys**) and keep the tab open. You'll need the **Project URL** and the **anon / publishable** key. Never use the `service_role` / secret key in the website.

### 2. Vercel (hosting)
1. In your Vercel project → **Settings → Environment Variables**, add:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon / publishable key |
   | `NEXT_PUBLIC_SITE_URL` | `https://intothedeets.com` |
2. Go to **Deployments** and click **Redeploy** on the latest one, so it picks up the variables.

### 3. Your domain
1. Vercel → **Settings → Domains** → add `intothedeets.com` (and `www.intothedeets.com`).
2. Vercel shows the DNS records to add. Add them at the registrar where you bought the domain. It usually starts working within an hour.

## Running it on your own computer (optional)

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # open http://localhost:3000
```

## Roadmap

1. ✅ Foundation: accounts, HQ, vendors, budget, tasks, partner invites
2. Brain Dump: type messy thoughts, and AI sorts them into tasks, vendor notes and reminders
3. "What am I forgetting?" assistant
4. Google Calendar and Drive connections; email forwarding address for vendor emails
5. Guests, RSVPs, save-the-dates and invitations; seating chart

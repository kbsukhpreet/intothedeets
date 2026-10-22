# Into the Deets

Event planning, organized: vendors, conversation history, payments, budget and tasks in one place — for weddings, birthdays, corporate events and more.

**Stack:** Next.js (website) · Supabase (database and logins) · Vercel (hosting)

## What's in it

- **Sign up** with full name, email, what you're using it for, a personal or team view, and a password (no email confirmation)
- **Personal or team view:** "Just me" shows a simple task/vendor/budget planner; "With a team" shows the Jira-style tickets. One-click switch in Settings; nothing is lost when switching
- **Teams** (like Jira): create a team, share one invite link, and everyone joins with their own account. A team can run many events; people can be on several teams
- **Tickets:** numbered (#12), with assignee, status (To do / In progress / Blocked / Done), priority, due date, description, linked vendor, and comments (editable by their author)
- **Private tickets:** tick Private and only the creator and assignee can see the ticket and its comments (enforced by the database)
- **Email notifications** (via Resend) when you're assigned a ticket; each person can turn them off in Settings. Comment notifications are planned for the phone app
- **Tickets dashboard:** progress for each person, a board and list view, and filters for me / a teammate / unassigned / an event
- **Event Dashboard:** countdown, payments due in the next 90 days, your tickets, vendor follow-ups, recent conversations
- **Vendors:** a workspace per vendor with contact info, status, contract total, a conversation log, payment schedule and tickets. Search covers conversation history too
- **Budget:** contract, paid and remaining per vendor, budget progress, and a payment timeline
- **Settings:** edit event details, delete an event

All data is protected by database security rules: people only see their own teams' events.

## One-time setup

### 1. Supabase (database)
1. Open your project → **SQL Editor** → **New query**.
2. **New project:** paste the contents of `supabase/schema.sql` and click **Run**.
   **Existing project:** run only the files in `supabase/migrations/` you haven't run yet, in order.
3. Go to **Authentication → Sign In / Providers → Email** and turn **Confirm email** off.
4. Go to **Authentication → URL Configuration**:
   - **Site URL:** `https://intothedeets.com`
   - **Redirect URLs:** add `https://intothedeets.com/**` and `https://*.vercel.app/**`
5. Go to **Project Settings → API** (or **API Keys**) and keep the tab open. You'll need the **Project URL** and the **anon / publishable** key. Never use the `service_role` / secret key in the website.

### 2. Vercel (hosting)
1. In your Vercel project → **Settings → Environment Variables**, add:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon / publishable key |
   | `NEXT_PUBLIC_SITE_URL` | `https://intothedeets.com` |
   | `RESEND_API_KEY` | API key from resend.com (mark as **Sensitive**) |
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

1. ✅ Foundation: accounts, teams, events, tickets dashboard, Event Dashboard, vendors, budget
2. Drag-and-drop board; @mentions in comments
3. Brain Dump: type messy thoughts, and AI sorts them into tasks, vendor notes and reminders
4. "What am I forgetting?" assistant
5. Google Calendar and Drive connections; email forwarding address for vendor emails
6. Guests, RSVPs, save-the-dates and invitations; seating chart

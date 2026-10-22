import { SITE_URL } from "@/lib/env";
import { prettyDate, priorityLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/*
 * Email notifications, sent through Resend (resend.com).
 * Needs RESEND_API_KEY in Vercel. If it's missing, emails are skipped quietly
 * so the rest of the app keeps working.
 */

const FROM = process.env.EMAIL_FROM || "Into the Deets <notifications@intothedeets.com>";

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function send(to: string, subject: string, html: string, text: string) {
  const key = (process.env.RESEND_API_KEY ?? "").replace(/[^\x21-\x7E]/g, "");
  if (!key) {
    console.log(`[email] RESEND_API_KEY not set; skipped "${subject}" to ${to}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
    });
    if (!res.ok) console.error(`[email] Resend error ${res.status}: ${await res.text()}`);
  } catch (e) {
    console.error("[email] failed to send", e);
  }
}

function layout({ heading, body, cta, ctaUrl, footer }: { heading: string; body: string; cta: string; ctaUrl: string; footer: string }) {
  return `<!doctype html><html><body style="margin:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#221e1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="padding:0 4px 16px;font-family:Georgia,serif;font-size:18px;color:#a8553f">Into the Deets</td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e9e2d8;border-radius:16px;padding:28px">
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;font-weight:normal;line-height:1.3">${heading}</h1>
        ${body}
        <p style="margin:24px 0 0"><a href="${ctaUrl}" style="display:inline-block;background:#a8553f;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600">${cta}</a></p>
      </td></tr>
      <tr><td style="padding:16px 4px;font-size:12px;color:#7a7067">${footer}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

type Ticket = {
  id: string;
  number: number;
  title: string;
  priority: string;
  due_date: string | null;
  event_id: string;
};

type Recipient = { email: string | null; full_name: string | null; notify_assigned: boolean; notify_comments: boolean };

async function lookup(ticketId: string, recipientId: string, actorId: string) {
  const supabase = await createClient();
  const [{ data: ticket }, { data: recipient }, { data: actor }] = await Promise.all([
    supabase.from("tasks").select("id, number, title, priority, due_date, event_id").eq("id", ticketId).maybeSingle(),
    supabase
      .from("profiles")
      .select("email, full_name, notify_assigned, notify_comments")
      .eq("id", recipientId)
      .maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", actorId).maybeSingle(),
  ]);
  if (!ticket || !recipient?.email) return null;
  const { data: event } = await supabase.from("events").select("name").eq("id", ticket.event_id).maybeSingle();
  return {
    ticket: ticket as Ticket,
    recipient: recipient as Recipient,
    actorName: actor?.full_name || actor?.email?.split("@")[0] || "Someone",
    eventName: event?.name ?? "your event",
  };
}

const settingsFooter = (what: string) =>
  `You're getting this because ${what}. Turn these emails off anytime in <a href="${SITE_URL || "https://intothedeets.com"}/settings" style="color:#7a7067">Settings</a>.`;

/** Email someone that a ticket was assigned to them (never for assigning yourself). */
export async function notifyAssigned(ticketId: string, assigneeId: string | null, actorId: string) {
  if (!assigneeId || assigneeId === actorId) return;
  const info = await lookup(ticketId, assigneeId, actorId);
  if (!info || !info.recipient.notify_assigned) return;
  const { ticket, recipient, actorName, eventName } = info;

  const url = `${SITE_URL || "https://intothedeets.com"}/tickets/${ticket.id}`;
  const details = [
    `<strong>Event:</strong> ${escape(eventName)}`,
    `<strong>Priority:</strong> ${priorityLabel(ticket.priority)}`,
    ticket.due_date ? `<strong>Due:</strong> ${prettyDate(ticket.due_date, true)}` : null,
  ].filter(Boolean);

  const subject = `${actorName} assigned you #${ticket.number}: ${ticket.title}`;
  const html = layout({
    heading: `${escape(actorName)} assigned you a ticket`,
    body: `<p style="margin:0 0 6px;font-size:13px;color:#7a7067">#${ticket.number}</p>
      <p style="margin:0 0 16px;font-size:17px;font-weight:600">${escape(ticket.title)}</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#4a433c">${details.join("<br>")}</p>`,
    cta: "Open ticket",
    ctaUrl: url,
    footer: settingsFooter("a ticket was assigned to you"),
  });
  const text = `${actorName} assigned you #${ticket.number}: ${ticket.title}\nEvent: ${eventName}\n\nOpen it: ${url}`;
  await send(recipient.email!, subject, html, text);
}

/**
 * Email the ticket's assignee when someone else comments on it.
 * Currently not used (paused to save email quota); kept for the phone app.
 */
export async function notifyComment(ticketId: string, assigneeId: string | null, actorId: string, comment: string) {
  if (!assigneeId || assigneeId === actorId) return;
  const info = await lookup(ticketId, assigneeId, actorId);
  if (!info || !info.recipient.notify_comments) return;
  const { ticket, recipient, actorName, eventName } = info;

  const url = `${SITE_URL || "https://intothedeets.com"}/tickets/${ticket.id}#comments`;
  const short = comment.length > 600 ? comment.slice(0, 600) + "…" : comment;
  const subject = `${actorName} commented on #${ticket.number}: ${ticket.title}`;
  const html = layout({
    heading: `${escape(actorName)} commented on your ticket`,
    body: `<p style="margin:0 0 4px;font-size:13px;color:#7a7067">#${ticket.number} · ${escape(eventName)}</p>
      <p style="margin:0 0 16px;font-size:17px;font-weight:600">${escape(ticket.title)}</p>
      <div style="border-left:3px solid #f5e6df;padding:4px 0 4px 14px;font-size:14px;line-height:1.6;white-space:pre-wrap">${escape(short)}</div>`,
    cta: "Reply",
    ctaUrl: url,
    footer: settingsFooter("you're assigned to this ticket"),
  });
  const text = `${actorName} commented on #${ticket.number}: ${ticket.title}\n\n"${short}"\n\nReply: ${url}`;
  await send(recipient.email!, subject, html, text);
}

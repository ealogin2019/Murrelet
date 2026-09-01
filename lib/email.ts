// Transactional email.
//
// Deliberately a single fetch against Resend's REST API rather than an SDK.
// One POST, one response — a package would add a dependency and a version to
// keep up with for no capability we'd use.
//
// Unconfigured is a valid state, not an error. Without RESEND_API_KEY this
// logs what it would have sent and reports sent: false. Nothing that calls it
// should treat that as a failure: an order is not less paid because a receipt
// didn't go out, and blowing up the webhook over it would be worse than the
// missing email.

const ENDPOINT = "https://api.resend.com/emails";

export type SendResult = { sent: boolean; id?: string; reason?: string };

/**
 * Who receipts come from. Needs a domain verified in Resend — the Vercel
 * subdomain cannot send mail. Until MAIL_FROM is set this stays unconfigured
 * and nothing is dispatched.
 */
function from(): string | null {
  return process.env.MAIL_FROM || null;
}

/**
 * Where a customer's reply lands.
 *
 * Sending runs from a subdomain (send.murrelet.co.uk) so that Resend's SPF
 * record cannot collide with the one Hostinger already publishes on the root:
 * a domain may carry only one SPF record, and two is a hard fail that sends
 * everything to spam. But that subdomain has no mailbox, so without an
 * explicit reply-to every reply would vanish.
 *
 * The receipt tells customers to reply quoting their order number, so this has
 * to point at a real inbox — orders@murrelet.co.uk, on Hostinger.
 */
function defaultReplyTo(): string | null {
  return process.env.MAIL_REPLY_TO || null;
}

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const sender = from();

  if (!key || !sender) {
    console.warn(
      `[email] not configured (${!key ? "RESEND_API_KEY" : "MAIL_FROM"} missing) — ` +
        `would have sent "${msg.subject}" to ${msg.to}`
    );
    return { sent: false, reason: "not-configured" };
  }

  // A receipt is worth waiting a few seconds for and no longer. The webhook
  // that calls this is on Stripe's clock, and a hung mail provider must not
  // be what makes the delivery time out.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 8000);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        // Always send both parts. A text/plain alternative is what keeps a
        // receipt readable in clients that refuse HTML, and its absence is
        // itself a spam signal.
        text: msg.text,
        // A per-message reply-to wins; MAIL_REPLY_TO is the standing default.
        ...(msg.replyTo || defaultReplyTo()
          ? { reply_to: msg.replyTo || defaultReplyTo() }
          : {}),
      }),
      signal: abort.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, reason: `${res.status} ${body.slice(0, 200)}` };
    }

    const data = (await res.json()) as { id?: string };
    return { sent: true, id: data.id };
  } catch (err: any) {
    return { sent: false, reason: err?.name === "AbortError" ? "timeout" : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

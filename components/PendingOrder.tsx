"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Waits for the webhook while the customer is looking at the page.
 *
 * Stripe redirects the browser and delivers the webhook independently, so the
 * two race. The customer usually wins: they arrive to an order that is still
 * pending, and the page used to sit on "we're still confirming" until they
 * thought to reload it themselves.
 *
 * `router.refresh()` re-runs the server component, which re-reads the order.
 * Once it comes back paid the page no longer renders this component at all, so
 * the polling stops by construction rather than by anything here noticing.
 *
 * There is a deadline. A webhook that has not landed in a minute is not
 * arriving in the next one either -- something is misconfigured, most likely a
 * missing STRIPE_WEBHOOK_SECRET -- and refreshing forever would leave a
 * customer watching a page that will never change its mind.
 */
const EVERY_MS = 2500;
const GIVE_UP_MS = 60_000;

export default function PendingOrder({ email }: { email: string | null }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => {
      if (Date.now() - started >= GIVE_UP_MS) {
        clearInterval(tick);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, EVERY_MS);

    return () => clearInterval(tick);
  }, [router]);

  if (gaveUp) {
    return (
      <p>
        Your payment is taking longer than usual to confirm. Nothing is wrong
        with your order and you have not been charged twice
        {email ? <> — we have your details at {email}</> : null}. Please contact
        us quoting your order number and we will confirm it by hand.
      </p>
    );
  }

  return (
    <p>
      We&apos;re still confirming your payment with our provider. This page will
      update on its own the moment it clears — there is no need to reload.
    </p>
  );
}

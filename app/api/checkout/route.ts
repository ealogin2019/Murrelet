import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getProducts } from "@/lib/blob-store";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey);

  try {
    const body = await req.json();
    const cartItems = body.items as {
      id: string;
      name: string;
      price: number;
      size: string;
      quantity: number;
    }[];

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    // Never trust a price sent from the browser — look up the current price
    // for each product id from the live catalog so an edited request body
    // can't change what's actually charged.
    const catalog = await getProducts();
    const items = cartItems.map((cartItem) => {
      const current = catalog.find((p) => p.id === cartItem.id);
      return {
        ...cartItem,
        name: current?.name ?? cartItem.name,
        price: current?.price ?? cartItem.price,
      };
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.origin}`;

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${item.name} — Size ${item.size}`,
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Basic flat-rate shipping. Free over $75, otherwise a flat $5 standard
    // rate plus an optional $15 express option.
    const shipping_options: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: subtotal >= 7500 ? 0 : 500, currency: "usd" },
          display_name: subtotal >= 7500 ? "Free shipping" : "Standard shipping (3–5 days)",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 5 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 1500, currency: "usd" },
          display_name: "Express shipping (1–2 days)",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 1 },
            maximum: { unit: "business_day", value: 2 },
          },
        },
      },
    ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "IE"],
      },
      shipping_options,
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout session error:", err);
    return NextResponse.json(
      { error: err.message || "Unable to start checkout." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCatalog } from "@/lib/catalog-store";
import { variantPrice } from "@/lib/catalog";
import { attachStripeSession, createPendingOrder } from "@/lib/orders";

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
      skuId: string;
      name: string;
      price: number;
      colour: string;
      size: string;
      quantity: number;
    }[];

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    // Never trust anything the browser sent about money. Resolve every line
    // from the live catalog by sku id and price it from the variant override
    // (falling back to the product list price). A tampered request body can
    // change the quantity but not the unit price.
    const catalog = await getCatalog();
    const items = [];
    for (const cartItem of cartItems) {
      const quantity = Math.max(1, Math.floor(Number(cartItem.quantity) || 1));
      const match = catalog
        .flatMap((p) =>
          p.variants.flatMap((v) =>
            v.skus
              .filter((s) => s.id === cartItem.skuId)
              .map((s) => ({ product: p, variant: v, sku: s }))
          )
        )
        .at(0);

      // A line that no longer resolves is a deleted or renamed SKU. Fail the
      // whole checkout rather than quietly charging the browser's price.
      if (!match) {
        return NextResponse.json(
          { error: "An item in your bag is no longer available. Please refresh." },
          { status: 409 }
        );
      }
      const label = `${match.product.name} (${match.variant.colour}, ${match.sku.size})`;

      if (!match.sku.inStock) {
        return NextResponse.json({ error: `${label} is out of stock.` }, { status: 409 });
      }

      // A tracked sku carries a count; an untracked one is showcase mode and
      // only has the boolean above to go on. This is a courtesy check, not a
      // reservation: nothing is held until the webhook decrements, so between
      // here and payment the last one can still go to someone else. It catches
      // the ordinary case of a bag left open while stock ran out.
      if (match.sku.stock !== null && match.sku.stock < quantity) {
        return NextResponse.json(
          {
            error:
              match.sku.stock === 0
                ? `${label} is out of stock.`
                : `Only ${match.sku.stock} left of ${label}.`,
          },
          { status: 409 }
        );
      }

      items.push({
        skuId: match.sku.id,
        name: match.product.name,
        colour: match.variant.colour,
        size: match.sku.size,
        price: variantPrice(match.product, match.variant),
        quantity,
        image: match.variant.images[0] ?? null,
      });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.origin}`;

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: `${item.name} — ${item.colour}, ${item.size}`,
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Flat-rate UK shipping. Free over £100, otherwise £4.95 standard plus an
    // optional £9.95 express option. Thresholds in pence.
    const FREE_SHIPPING_THRESHOLD = 10000;
    const shipping_options: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 495,
            currency: "gbp",
          },
          display_name:
            subtotal >= FREE_SHIPPING_THRESHOLD
              ? "Free standard delivery"
              : "Standard delivery (3–5 days)",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 5 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 995, currency: "gbp" },
          display_name: "Express delivery (1–2 days)",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 1 },
            maximum: { unit: "business_day", value: 2 },
          },
        },
      },
    ];

    // Record the order before sending the customer to Stripe, so what was
    // sold and at what price is captured from the server's own resolution
    // rather than reconstructed later from a webhook payload.
    const order = await createPendingOrder(
      items.map((i) => ({
        skuId: i.skuId,
        productName: i.name,
        colour: i.colour,
        size: i.size,
        unitPricePence: i.price,
        quantity: i.quantity,
        imageUrl: i.image,
      })),
      subtotal
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: {
        allowed_countries: ["GB", "IE"],
      },
      shipping_options,
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_number: order.orderNumber },
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
    });

    await attachStripeSession(order.id, session.id);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout session error:", err);
    return NextResponse.json(
      { error: err.message || "Unable to start checkout." },
      { status: 500 }
    );
  }
}

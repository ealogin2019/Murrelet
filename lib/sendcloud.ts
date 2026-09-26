// Sendcloud, API v3.
//
// Everything here was learned the hard way on Hyms before it was written
// here, so the shape is not up for casual revision:
//
//   v3 only            Parcels v2 is retired for new accounts. Labels are made
//                      with POST /shipments/announce, nothing else.
//   ISO-2 country      "United Kingdom" becomes "UN" and a 400. Stripe already
//                      gives us alpha-2, and we refuse anything else.
//   a contract         A shipping option can be quoted without one but a label
//                      cannot be bought without one. Filter on contract.id.
//   home delivery      Anything else needs a service point we never collected.
//   the label link     is an authenticated API document, not a PDF URL. Fetch
//                      it with the key and re-host it privately.
//   sendcloud:letter   the free unstamped option. Test mode ships only this,
//                      so no test ever produces a carrier invoice.
//
// Unconfigured is a valid state: without keys every call reports it and
// nothing is sent, the same contract as lib/email.ts.

const BASE = "https://panel.sendcloud.sc/api/v3";

export type SendcloudConfig = { auth: string; testMode: boolean; senderId?: string; optionCode?: string };

export function sendcloudConfig(): SendcloudConfig | null {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY;
  const sec = process.env.SENDCLOUD_SECRET_KEY;
  if (!pub || !sec) return null;
  return {
    auth: Buffer.from(`${pub}:${sec}`).toString("base64"),
    testMode: (process.env.SENDCLOUD_TEST_MODE || "").toLowerCase() === "true",
    senderId: process.env.SENDCLOUD_SENDER_ADDRESS_ID || undefined,
    optionCode: process.env.SENDCLOUD_SHIPPING_OPTION_CODE || undefined,
  };
}

async function api(cfg: SendcloudConfig, path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${cfg.auth}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body; kept as text below */
  }
  if (!res.ok) {
    throw new Error(`Sendcloud ${res.status} on ${path}: ${(text || "").slice(0, 300)}`);
  }
  return json;
}

export type SenderAddress = {
  id: number;
  name?: string;
  company_name?: string;
  address_line_1?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
  country_code?: string;
  phone_number?: string;
  email?: string;
};

/** The shop's from-address, configured once in the Sendcloud panel. */
export async function senderAddress(cfg: SendcloudConfig): Promise<SenderAddress> {
  const json = await api(cfg, "/addresses/sender-addresses");
  const list: SenderAddress[] = json?.data ?? [];
  if (!list.length) {
    throw new Error("No sender address in Sendcloud -- add one under Settings > Addresses.");
  }
  if (cfg.senderId) {
    const found = list.find((a) => String(a.id) === String(cfg.senderId));
    if (found) return found;
  }
  return list[0];
}

export type ShipOption = { code: string; contractId?: number; carrier?: string; pricePence: number | null };

/**
 * The cheapest home-delivery option with a contract for this route, or the
 * env-pinned one if it is usable. Quotes come back with the options, so the
 * carrier cost is known before the label is bought and gets stored with it.
 */
export async function pickOption(
  cfg: SendcloudConfig,
  route: { fromCountry: string; fromPostal: string; toCountry: string; toPostal: string; weightKg: string }
): Promise<ShipOption> {
  if (cfg.testMode) return { code: "sendcloud:letter", pricePence: 0, carrier: "test" };
  const json = await api(cfg, "/shipping-options", {
    method: "POST",
    body: JSON.stringify({
      from_country_code: route.fromCountry,
      to_country_code: route.toCountry,
      from_postal_code: route.fromPostal,
      to_postal_code: route.toPostal,
      parcels: [{ weight: { value: route.weightKg, unit: "kg" } }],
      calculate_quotes: true,
      functionalities: { last_mile: "home_delivery" },
    }),
  });
  const list: any[] = json?.data ?? [];
  // Letter formats are excluded. Sendcloud quotes Royal Mail Tracked 48
  // "letter" for anything up to 750 g -- £2.38 against £3.04 for the smallest
  // parcel -- and sorting by price alone picks it for a hoodie. A Large Letter
  // is capped at 25 mm thick; a folded hoodie is nothing like that, so the
  // parcel is surcharged or returned at the sorting centre and the 66p saved
  // costs several pounds. Price is not the only constraint, and the quote API
  // does not know what is in the box.
  //
  // To sell a garment that genuinely is letter-sized, measure it and pin the
  // code with SENDCLOUD_SHIPPING_OPTION_CODE rather than removing this filter.
  const usable = list.filter(
    (o) =>
      o?.code &&
      o?.contract?.id &&
      (o?.functionalities?.last_mile ?? "home_delivery") === "home_delivery" &&
      !/\/letter$/.test(o.code)
  );
  if (!usable.length) {
    throw new Error("Sendcloud has no contracted home-delivery option for this route.");
  }
  const price = (o: any) => {
    const v = o?.quotes?.[0]?.price?.total?.value;
    const n = v != null ? Number(v) : NaN;
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  };
  const toOpt = (o: any): ShipOption => ({
    code: o.code,
    contractId: o.contract.id,
    carrier: o?.carrier?.name ?? o?.carrier?.code ?? undefined,
    pricePence: Number.isFinite(price(o)) ? Math.round(price(o) * 100) : null,
  });
  if (cfg.optionCode) {
    const pinned = usable.find((o) => o.code === cfg.optionCode);
    if (pinned) return toOpt(pinned);
  }
  usable.sort((a, b) => price(a) - price(b));
  return toOpt(usable[0]);
}

export type Announced = {
  parcelId: number;
  trackingNumber: string;
  trackingUrl: string;
  carrier?: string;
  labelLink?: string;
};

export async function announce(
  cfg: SendcloudConfig,
  p: {
    orderNumber: string;
    from: SenderAddress;
    to: {
      name: string;
      line1: string;
      line2?: string | null;
      city: string;
      postal: string;
      country: string;
      email?: string | null;
      phone?: string | null;
    };
    option: ShipOption;
    weightKg: string;
  }
): Promise<Announced> {
  const from = p.from;
  const payload = {
    label_details: { mime_type: "application/pdf" },
    from_address: {
      name: from.name || from.company_name || "Murrelet",
      company_name: from.company_name || undefined,
      address_line_1: from.address_line_1,
      house_number: from.house_number || undefined,
      postal_code: from.postal_code,
      city: from.city,
      country_code: from.country_code || "GB",
      phone_number: from.phone_number || undefined,
      email: from.email || undefined,
    },
    to_address: {
      name: p.to.name,
      address_line_1: p.to.line1,
      ...(p.to.line2 ? { address_line_2: p.to.line2 } : {}),
      house_number: houseNumber(p.to.line1),
      postal_code: p.to.postal,
      city: p.to.city,
      country_code: p.to.country,
      email: p.to.email || undefined,
      phone_number: p.to.phone || undefined,
    },
    order_number: p.orderNumber,
    external_reference_id: p.orderNumber,
    ship_with: {
      type: "shipping_option_code",
      properties: {
        shipping_option_code: p.option.code,
        ...(p.option.contractId ? { contract_id: p.option.contractId } : {}),
      },
    },
    parcels: [{ weight: { value: p.weightKg, unit: "kg" } }],
  };
  const json = await api(cfg, "/shipments/announce", { method: "POST", body: JSON.stringify(payload) });
  const parcel = json?.data?.parcels?.[0];
  if (!parcel?.id) throw new Error("Sendcloud announced no parcel: " + JSON.stringify(json).slice(0, 300));
  const label = (parcel.documents as { type: string; link: string }[] | undefined)?.find((d) => d.type === "label");
  return {
    parcelId: parcel.id,
    trackingNumber: parcel.tracking_number || "",
    trackingUrl: parcel.tracking_url || "",
    carrier: parcel?.carrier?.code ?? p.option.carrier,
    labelLink: label?.link,
  };
}

/** The label bytes. The link is an API document and needs the key. */
export async function fetchLabel(cfg: SendcloudConfig, link: string): Promise<Uint8Array> {
  const res = await fetch(link, { headers: { Authorization: `Basic ${cfg.auth}` } });
  if (!res.ok) throw new Error(`Label download failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Best-effort UK house number from a free-form first line. */
function houseNumber(line: string): string | undefined {
  return line.match(/\b(\d+[a-zA-Z]?)\b/)?.[1];
}

/**
 * Parcel weight from what is in the box. Blank weights per garment plus
 * packaging; conservative, since an under-declared parcel is surcharged and
 * an over-declared one costs pennies.
 */
const GARMENT_GRAMS: Record<string, number> = {
  "t-shirts": 200,
  hoodies: 600,
  sweatshirts: 520,
};
const PACKAGING_GRAMS = 60;

export function parcelWeightKg(lines: { productType: string | null; quantity: number }[]): string {
  const grams = lines.reduce((g, l) => g + (GARMENT_GRAMS[l.productType ?? ""] ?? 400) * l.quantity, PACKAGING_GRAMS);
  return (grams / 1000).toFixed(3);
}

/**
 * Sendcloud parcel status codes, as Hyms verified them in production.
 *
 * SHIPPED means the parcel actually MOVED. 1000 "Announced" and 1001 "En
 * route to sorting center" fire the instant a label is created and are
 * deliberately absent: a label is not a shipment.
 */
export const SHIPPED_CODES = new Set([
  11, // at sorting centre
  12, // in transit
  13, // delivery attempt failed
  14, // at customs
  15, // customs cleared
  17, // delivery attempt 2
  18, // delivery attempt 3
  20, 21, 22, // delivery delayed
  91, // out for delivery
  92, // delivery appointment
]);
export const DELIVERED_CODES = new Set([
  93, // delivered
  94, // to neighbour
  95, // to safe place
  96, // to post office
  97, // to parcel locker
  99, // delivered, generic
]);

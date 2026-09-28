import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/blob-store";

export const dynamic = "force-dynamic";

// Admin only: middleware.ts and requireAdmin() below both check the session.

const MAX_BYTES = 10_000_000;
const FOLDERS = new Set(["products", "hero", "uploads"]);

function sniffImage(b: Uint8Array): { type: string; ext: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return { type: "image/png", ext: "png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { type: "image/webp", ext: "webp" };
  if (ascii(4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(8, 12))) return { type: "image/avif", ext: "avif" };
  return null;
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is ${(file.size / 1e6).toFixed(1)} MB; the limit is ${MAX_BYTES / 1e6} MB.` },
      { status: 413 }
    );
  }

  // The type is read from the file's own first bytes, not from what the
  // browser declared. Uploads are served publicly from R2 under the content
  // type set here, so a declared "image/png" that is really HTML or SVG would
  // be a script served from our own bucket. Only raster formats are allowed.
  const kind = sniffImage(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!kind) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or AVIF images can be uploaded." },
      { status: 415 }
    );
  }

  // A fixed set of prefixes. The folder becomes the start of the R2 key, so a
  // free-text value could write anywhere in the public bucket -- including
  // over data/hero.json.
  const requested = (formData?.get("folder") as string | null) || "uploads";
  if (!FOLDERS.has(requested)) {
    return NextResponse.json({ error: `Unknown upload folder "${requested}".` }, { status: 400 });
  }
  const base = file.name.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase().slice(0, 60);
  const pathname = `${requested}/${Date.now()}-${base || "image"}.${kind.ext}`;

  try {
    const url = await uploadImage(pathname, file, kind.type);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/blob-store";

export const dynamic = "force-dynamic";

// Protected by middleware.ts (requires a valid admin session cookie).
// Note: Vercel route handlers cap request bodies at 4.5MB — plenty for
// typical web photos, but very large raw camera files may be rejected.

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }

  const folder = (formData?.get("folder") as string) || "uploads";
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, "-").toLowerCase();
  const pathname = `${folder}/${Date.now()}-${safeName}`;

  try {
    const url = await uploadImage(pathname, file);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 500 });
  }
}

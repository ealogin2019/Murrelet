import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap status-page">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The page you&rsquo;re looking for doesn&rsquo;t exist, or has moved.</p>
      <Link href="/" className="btn" style={{ display: "inline-block", width: "auto" }}>
        Back to Murrelet
      </Link>
    </div>
  );
}

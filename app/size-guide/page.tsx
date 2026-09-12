import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "Garment measurements for Murrelet tees and hoodies, size by size, with the chest each size is cut for.",
};

// These are the garments' own spec sheets, not generic UK ranges: the tee
// chart from the supplier, the hoodie chart supplied by the owner on
// 2026-09-05. The same numbers drive the image engine's crest sizing, so the
// chart a customer reads and the garment in the photograph agree by
// construction. Width is the garment laid flat, armpit to armpit, so a
// customer can measure a tee they already own and match it.
//
// The tee runs S upward on its sheet; there is no XS tee. The size run on
// sale still lists XS -- see the note in the JSX.

const TEE = [
  { size: "S", chest: "34–36", width: 46, length: 71 },
  { size: "M", chest: "38–40", width: 51, length: 74 },
  { size: "L", chest: "42–44", width: 56, length: 76 },
  { size: "XL", chest: "46–48", width: 61, length: 79 },
  { size: "XXL", chest: "50–52", width: 66, length: 81 },
];

const HOODIE = [
  { size: "XS", chest: "34", width: 49, length: 64 },
  { size: "S", chest: "36", width: 51, length: 67 },
  { size: "M", chest: "40", width: 56, length: 70 },
  { size: "L", chest: "44", width: 61, length: 73 },
  { size: "XL", chest: "48", width: 65, length: 76 },
  { size: "XXL", chest: "52", width: 69, length: 79 },
];

function Chart({ rows }: { rows: typeof TEE }) {
  return (
    <table className="info-table size-table">
      <thead>
        <tr>
          <th>Size</th>
          <th>To fit chest (in)</th>
          <th>Garment width (cm)</th>
          <th>Garment length (cm)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.size}>
            <td>{r.size}</td>
            <td>{r.chest}</td>
            <td>{r.width}</td>
            <td>{r.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function SizeGuidePage() {
  return (
    <InfoPage eyebrow="Help" title="Size Guide">
      <p>
        Two ways to choose. <strong>To fit chest</strong> is your body measurement,
        taken around the fullest part of the chest. <strong>Garment width</strong> is
        the piece itself laid flat, armpit to armpit &mdash; measure a tee or hoodie
        you already like the fit of and match it here. Tolerance is about 2&nbsp;cm
        either way.
      </p>

      <h2>Tees</h2>
      <p>Modern classic fit. True to size; between sizes, take the larger.</p>
      <Chart rows={TEE} />

      <h2>Hoodies</h2>
      <p>Regular fit with room to layer. True to size; size up for an oversized look.</p>
      <Chart rows={HOODIE} />

      <h2>How to measure</h2>
      <p>
        <strong>Chest:</strong> wrap a tape under your arms, around the fullest part of
        your chest, level and snug but not tight. <strong>A garment you own:</strong>{" "}
        lay it flat, smooth it, and measure straight across from one armpit seam to
        the other for width, and from the highest point of the shoulder to the hem
        for length.
      </p>
    </InfoPage>
  );
}

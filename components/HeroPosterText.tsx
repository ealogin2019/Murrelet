"use client";

/**
 * The poster's copy, as live text.
 *
 * Right now it lands ON TOP of the same words painted into the JPEG, which is
 * deliberate and temporary: it is the only way to judge placement and timing
 * before the clean plates exist. Once the posters come back without type, the
 * painted copy disappears and this becomes the real headline — selectable,
 * translatable, readable by search, and free to reflow.
 *
 * Positions are percentages of the visible frame, worked out from where the
 * painted copy actually sits. Measured on the poster (1024 x 1536): headline
 * rows 455-662, subline 747-797, feature list 943-1270, all starting near
 * column 70. The phone frame shows rows 77-1316, so the headline's top lands
 * at (455-77)/1239 = 30.5% of it; the desktop crop puts the same line at
 * 27.6%. One value serves both closely enough while this is a mock-up.
 */

/** Line icons, drawn to sit beside the feature copy at its own scale.
 *  Stroke-only and currentColor, so they inherit the copy's ink and stay
 *  crisp at any size — the painted ones are raster and cannot. */
const ICONS: Record<string, string> = {
  // A cotton boll: four petals around a centre, on a short stem.
  cotton:
    "M12 11.6c-1.9-2-1.9-4.3-.5-5.6 1.2-1.1 3-.6 3.4 1.1.4-1.7 2.2-2.2 3.4-1.1 1.4 1.3 1.4 3.6-.5 5.6m-5.8 0c-2-1.9-4.3-1.9-5.6-.5-1.1 1.2-.6 3 1.1 3.4-1.7.4-2.2 2.2-1.1 3.4 1.3 1.4 3.6 1.4 5.6-.5m0-5.8c2-1.9 4.3-1.9 5.6-.5 1.1 1.2.6 3-1.1 3.4 1.7.4 2.2 2.2 1.1 3.4-1.3 1.4-3.6 1.4-5.6-.5M12 11.6v9.4",
  // A leaf with its midrib.
  leaf:
    "M4 20C2 14 5 5 20 4c1 12-6 16-12 15.4M4 20c1.6-4.2 4.6-7.6 8.6-9.6",
  // A tee: shoulders, sleeves, body.
  tee:
    "M8 3 4.5 5.2 3 9.4l3 1.1V21h12v-10.5l3-1.1-1.5-4.2L16 3a4 4 0 0 1-8 0Z",
  // A hoodie: the tee, plus a hood and a drawcord.
  hoodie:
    "M8.5 3 4.5 5.4 3 9.6l3 1.1V21h12v-10.3l3-1.1-1.5-4.2L15.5 3M8.5 3c0 2.6 1.6 4.2 3.5 4.2S15.5 5.6 15.5 3M9.8 7.6v3.6M14.2 7.6v3.6",
};

export type Feature = { icon: keyof typeof ICONS; lines: string[] };

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="hpt-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={ICONS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** One word, split to characters, each carrying its own delay. */
function Word({ text, from }: { text: string; from: number }) {
  return (
    <span className="hpt-word">
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className="hpt-char"
          style={{ animationDelay: `${(from + i) * 26}ms` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/**
 * Characters animate one after another, so the delay has to keep counting
 * across word boundaries rather than restarting — otherwise every word starts
 * together and the line arrives in chunks instead of sweeping.
 */
function Line({ text, start }: { text: string; start: number }) {
  let n = start;
  return (
    <span className="hpt-line">
      {text.split(" ").map((w, i) => {
        const from = n;
        n += w.length + 1;
        return <Word key={i} text={w} from={from} />;
      })}
    </span>
  );
}

export default function HeroPosterText({
  headline,
  subline,
  features,
  leaving = false,
}: {
  /** One entry per rendered line — the break is a design decision, not the
   *  browser's, so it is set here rather than left to wrapping. */
  headline: string[];
  subline: string[];
  features: Feature[];
  /** Fade the whole block out ahead of a poster change, so the copy is gone
   *  before the photograph behind it starts dissolving. */
  leaving?: boolean;
}) {
  // Characters counted across the whole headline so the sweep runs unbroken
  // from the first letter of the first line to the last of the last.
  let n = 0;
  const lines = headline.map((l) => {
    const start = n;
    n += l.length + 1;
    return { l, start };
  });
  const tail = n * 26;

  return (
    <div
      className={`hero-poster-text ${leaving ? "is-leaving" : ""}`}
      aria-label={headline.join(" ")}
    >
      <h2 className="hpt-headline" aria-hidden="true">
        {lines.map(({ l, start }, i) => (
          <Line key={i} text={l} start={start} />
        ))}
      </h2>

      {/* The rule and everything under it arrive as blocks, after the headline
          has finished. Animating these per character too would read as a
          gimmick rather than an entrance. */}
      <span className="hpt-rule" style={{ animationDelay: `${tail + 80}ms` }} />

      <p className="hpt-sub" style={{ animationDelay: `${tail + 200}ms` }}>
        {subline.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </p>

      <ul className="hpt-features">
        {features.map((f, i) => (
          <li
            key={f.lines.join(" ")}
            style={{ animationDelay: `${tail + 380 + i * 110}ms` }}
          >
            <Icon name={f.icon} />
            <span className="hpt-feature-copy">
              {f.lines.map((part, j) => (
                <span key={j}>{part}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

/**
 * The poster's copy, as live text.
 *
 * Right now it lands ON TOP of the same words baked into the JPEG, which is
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
}: {
  /** One entry per rendered line — the break is a design decision, not the
   *  browser's, so it is set here rather than left to wrapping. */
  headline: string[];
  subline: string[];
  features: string[];
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
    <div className="hero-poster-text" aria-label={headline.join(" ")}>
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
          <li key={f} style={{ animationDelay: `${tail + 380 + i * 110}ms` }}>
            {f.split("\n").map((part, j) => (
              <span key={j}>{part}</span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "About",
  description: "Murrelet makes logo tees and hoodies: one crest, a short list of colours, garments chosen to be worn.",
};

// Written from what is true of the range as it stands: two garments, three
// prints, and the crest. No origin story is claimed here because none has
// been given; the owner can add one above "What we make" when there is one.
export default function AboutPage() {
  return (
    <InfoPage eyebrow="About" title="Murrelet">
      <img
        className="about-photo"
        src="/images/catalog/small-logo-hoodie/light-grey/2.webp"
        alt="The Murrelet crest on a light grey hoodie"
      />

      <p>
        Murrelet is a mark and the clothes that carry it. A crest, drawn once and
        printed small at the chest or set large as a wordmark, on garments chosen
        because they are worn rather than kept.
      </p>

      <h2>What we make</h2>
      <p>
        Two things, done in three ways. A lightweight ringspun cotton tee and a
        280&nbsp;gsm brushed-back fleece hoodie, each carrying the crest alone, the
        crest with the wordmark, or the wordmark large across the chest. Nine
        colourways on the tee, six on the hoodie.
      </p>

      <h2>How we think about it</h2>
      <p>
        One mark, a short list of colours, and garments that hold their shape
        through a year of washing. We would rather add a colour than a category, and
        we would rather the print sat exactly where it should on every photograph
        than show you something the garment will not do.
      </p>

      <h2>Where to find us</h2>
      <p>
        Online only for now, shipping to the United Kingdom and Ireland. Questions go
        through the <a href="/contact">contact page</a>; replies come from a person.
      </p>
    </InfoPage>
  );
}

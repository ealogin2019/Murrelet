import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "About",
  description: "Considered warm-weather clothing, made to be worn.",
};

export default function AboutPage() {
  return (
    <InfoPage eyebrow="About" title="Murrelet">
      <p className="placeholder-flag">
        This is a starting template, not the real story yet &mdash; replace it with
        your own when you&rsquo;re ready.
      </p>

      <img
        className="about-photo"
        src="/images/catalog/custom-fit-linen-shirt/light-blue/1.jpg"
        alt=""
      />

      <p>
        Murrelet makes clothes for the parts of the day that matter &mdash; the ones
        spent outside, unhurried, in good company. Linen that softens instead of
        creasing. Cotton cut to move with you, not against you. Colour chosen for how
        it looks in real light, not on a screen.
      </p>

      <h2>What we make</h2>
      <p>
        A small, considered range: shirts, polo shirts and shorts, built from natural
        fibres and cut to be worn, not just owned. We&rsquo;d rather make four things
        well than forty things adequately.
      </p>

      <h2>How we think about it</h2>
      <p>
        No logo soup, no trend chasing &mdash; just fabric, fit and colour, done
        properly. If a piece isn&rsquo;t something we&rsquo;d wear ourselves, it
        doesn&rsquo;t make the range.
      </p>
    </InfoPage>
  );
}

import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "UK menswear size chart for shirts, polo shirts and shorts.",
};

// Standard UK menswear ranges — the same ballpark most UK retailers publish.
// A reasonable default until real fit data replaces it; see the flag below.
export default function SizeGuidePage() {
  return (
    <InfoPage eyebrow="Help" title="Size Guide">
      <p className="placeholder-flag">
        These are standard UK menswear ranges, not yet measured against our own
        garments &mdash; swap in real fit data once it exists.
      </p>

      <h2>Tops &mdash; t-shirts, polo shirts, shirts</h2>
      <p>Measured around the fullest part of the chest.</p>
      <table className="info-table size-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Chest (in)</th>
            <th>Chest (cm)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>XS</td>
            <td>34</td>
            <td>86</td>
          </tr>
          <tr>
            <td>S</td>
            <td>36&ndash;38</td>
            <td>91&ndash;97</td>
          </tr>
          <tr>
            <td>M</td>
            <td>39&ndash;41</td>
            <td>99&ndash;104</td>
          </tr>
          <tr>
            <td>L</td>
            <td>42&ndash;44</td>
            <td>107&ndash;112</td>
          </tr>
          <tr>
            <td>XL</td>
            <td>45&ndash;47</td>
            <td>114&ndash;119</td>
          </tr>
          <tr>
            <td>XXL</td>
            <td>48&ndash;50</td>
            <td>122&ndash;127</td>
          </tr>
        </tbody>
      </table>

      <h2>Shorts</h2>
      <p>Measured around the natural waist.</p>
      <table className="info-table size-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Waist (in)</th>
            <th>Waist (cm)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>XS</td>
            <td>28</td>
            <td>71</td>
          </tr>
          <tr>
            <td>S</td>
            <td>30&ndash;31</td>
            <td>76&ndash;79</td>
          </tr>
          <tr>
            <td>M</td>
            <td>32&ndash;33</td>
            <td>81&ndash;84</td>
          </tr>
          <tr>
            <td>L</td>
            <td>34&ndash;36</td>
            <td>86&ndash;91</td>
          </tr>
          <tr>
            <td>XL</td>
            <td>38&ndash;40</td>
            <td>97&ndash;102</td>
          </tr>
          <tr>
            <td>XXL</td>
            <td>42&ndash;44</td>
            <td>107&ndash;112</td>
          </tr>
        </tbody>
      </table>

      <h2>How to measure</h2>
      <p>
        Chest: wrap a tape measure under your arms, around the fullest part of your
        chest, keeping it level and snug but not tight. Waist: measure around your
        natural waistline, roughly where trousers sit when worn without a belt.
      </p>
    </InfoPage>
  );
}

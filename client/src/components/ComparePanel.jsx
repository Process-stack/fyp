import { ArrowLeftRight } from "lucide-react";

const pillars = [
  ["relevance", "Job relevance"],
  ["ats", "ATS structure"],
  ["formatting", "Text formatting"]
];

export default function ComparePanel({ analyses, onClose }) {
  if (!analyses?.length) return null;
  return (
    <section className="compare-panel">
      <div className="section-title">
        <div><span className="eyebrow">SIDE-BY-SIDE</span><h2>Analysis comparison</h2></div>
        <button className="text-button" onClick={onClose}>Close</button>
      </div>
      <div className="compare-grid">
        {analyses.map((analysis) => (
          <div className="compare-column" key={analysis._id}>
            <span className="compare-filename">{analysis.filename}</span>
            <strong className="compare-score">{analysis.score}<small>/100</small></strong>
            {pillars.map(([key, label]) => (
              <div className="compare-stat" key={key}><span>{label}</span><strong>{analysis.pillars[key]}</strong></div>
            ))}
            <div className="compare-stat"><span>Matched terms</span><strong>{analysis.keywords.matched.length}</strong></div>
          </div>
        ))}
      </div>
      <p className="footnote"><ArrowLeftRight size={14} /> Scores are comparable only when the job descriptions and weight settings are similar.</p>
    </section>
  );
}

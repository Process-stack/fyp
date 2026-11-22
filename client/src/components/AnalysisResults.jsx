import { AlertCircle, Check, Download, FileSearch, Scale, Sparkles } from "lucide-react";
import ScoreRing from "./ScoreRing.jsx";

const pillarNames = {
  relevance: "Job relevance",
  ats: "ATS structure",
  formatting: "Text formatting"
};

function Pillar({ name, score, weight }) {
  return (
    <div className="pillar">
      <div className="pillar-heading">
        <span>{name}</span>
        <strong>{score}<small>/100</small></strong>
      </div>
      <div className="progress-track">
        <div className="progress-value" style={{ width: `${score}%` }} />
      </div>
      <span className="pillar-weight">{weight}% of overall score</span>
    </div>
  );
}

export default function AnalysisResults({
  analysis,
  busyAction,
  onFairness,
  onAdvisory,
  onReport
}) {
  if (!analysis) {
    return (
      <section className="empty-results">
        <div className="empty-icon"><FileSearch size={22} /></div>
        <h2>Your analysis will appear here</h2>
        <p>Upload a resume and add a job description to see the score, evidence, and improvement areas.</p>
        <div className="empty-trust"><Check size={15} /> Transparent, explainable scoring</div>
      </section>
    );
  }

  const audit = analysis.fairnessAudit;
  return (
    <section className="results-stack" aria-live="polite">
      <div className="result-card score-overview">
        <div>
          <div className="eyebrow">YOUR MATCH OVERVIEW</div>
          <h2>Resume fit score</h2>
          <p>Weighted deterministic assessment</p>
        </div>
        <ScoreRing score={analysis.score} />
      </div>

      <div className="result-card">
        <div className="section-title">
          <div><span className="eyebrow">THREE-PILLAR MODEL</span><h2>Score breakdown</h2></div>
        </div>
        <div className="pillar-list">
          {Object.entries(analysis.pillars).map(([key, score]) => (
            <Pillar key={key} name={pillarNames[key]} score={score} weight={analysis.weights[key]} />
          ))}
        </div>
      </div>

      <div className="result-card">
        <div className="section-title">
          <div><span className="eyebrow">KEYWORD COVERAGE</span><h2>Job description signals</h2></div>
        </div>
        <p className="muted-copy">Terms below are ranked from the job description; this is not a requirement to add every term.</p>
        <div className="keyword-group">
          <h3><span className="status-dot good" />Found in resume <small>{analysis.keywords.matched.length}</small></h3>
          <div className="chips">
            {analysis.keywords.matched.length ? analysis.keywords.matched.slice(0, 18).map((term) => (
              <span className="chip chip-good" key={term}>{term}</span>
            )) : <span className="subtle">No exact keyword matches found.</span>}
          </div>
        </div>
        <div className="keyword-group">
          <h3><span className="status-dot warn" />Not detected <small>{analysis.keywords.missing.length}</small></h3>
          <div className="chips">
            {analysis.keywords.missing.length ? analysis.keywords.missing.slice(0, 18).map((term) => (
              <span className="chip chip-missing" key={term}>{term}</span>
            )) : <span className="subtle">No high-priority terms are missing.</span>}
          </div>
        </div>
      </div>

      <div className="result-card">
        <div className="section-title">
          <div><span className="eyebrow">EVIDENCE</span><h2>Relevant resume sentences</h2></div>
        </div>
        {analysis.explanations?.length ? (
          <div className="evidence-list">
            {analysis.explanations.map((item, index) => (
              <article className="evidence-item" key={`${index}-${item.sentence.slice(0, 16)}`}>
                <span className="evidence-score">{item.relevance}%</span>
                <div>
                  <p>“{item.sentence}”</p>
                  <div className="chips">{item.matchedTerms.map((term) => <span className="chip chip-neutral" key={term}>{term}</span>)}</div>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="subtle">No resume sentence directly matched the detected job-description terms.</p>}
      </div>

      <div className="result-card">
        <div className="section-title">
          <div><span className="eyebrow">DOCUMENT CHECKS</span><h2>ATS & text signals</h2></div>
        </div>
        <div className="metric-grid">
          <div className="metric-box"><strong>{analysis.metrics.ats.detectedSections.length}</strong><span>Recognized sections</span></div>
          <div className="metric-box"><strong>{analysis.metrics.ats.bulletLines}</strong><span>Bullet lines</span></div>
          <div className="metric-box"><strong>{analysis.metrics.formatting.pageCount}</strong><span>Pages detected</span></div>
          <div className="metric-box"><strong>{analysis.metrics.formatting.averageLineLength}</strong><span>Avg. chars / line</span></div>
        </div>
        <div className="signal-row">
          <span>{analysis.metrics.ats.contact.email ? "Email detected" : "Email not detected"}</span>
          <span>{analysis.metrics.ats.contact.phone ? "Phone detected" : "Phone not detected"}</span>
          <span>{analysis.metrics.ats.contact.professionalLink ? "Professional link found" : "No professional link found"}</span>
        </div>
        <p className="footnote"><AlertCircle size={14} /> {analysis.metrics.formatting.note}</p>
      </div>

      <div className="result-card action-card">
        <div className="section-title">
          <div><span className="eyebrow">OPTIONAL TOOLS</span><h2>Review & export</h2></div>
        </div>
        <div className="action-row">
          <button className="button button-secondary" disabled={busyAction} onClick={onFairness}>
            <Scale size={16} /> {busyAction === "fairness" ? "Checking…" : "Run name-mask audit"}
          </button>
          <button className="button button-secondary" disabled={busyAction} onClick={onAdvisory}>
            <Sparkles size={16} /> {busyAction === "advisory" ? "Requesting…" : "AI advisory"}
          </button>
          <button className="button button-secondary" disabled={busyAction} onClick={onReport}>
            <Download size={16} /> Download PDF
          </button>
        </div>
        {audit && (
          <div className="audit-panel">
            <strong>Name-masking sensitivity</strong>
            {audit.parityIndex === null ? (
              <p>{audit.interpretation}</p>
            ) : (
              <p>Score before: {audit.originalScore} · after masking: {audit.maskedScore} · index: {audit.parityIndex}/100</p>
            )}
            <p className="footnote">{audit.interpretation}</p>
          </div>
        )}
        {analysis.advisory && (
          <div className="advisory-panel">
            <strong>Optional, non-authoritative suggestions</strong>
            <p>{analysis.advisory}</p>
            <span>This advisory does not alter deterministic scores.</span>
          </div>
        )}
      </div>
      <p className="decision-note">Decision-support only. Do not use this score as an automated hiring decision.</p>
    </section>
  );
}

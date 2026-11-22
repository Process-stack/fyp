import { FileText, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

const initialWeights = { relevance: 50, ats: 30, formatting: 20 };

export default function UploadForm({ onAnalyze, submitting }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [weights, setWeights] = useState(initialWeights);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState("");

  function chooseFile(selected) {
    const candidate = selected?.[0];
    if (!candidate) return;
    if (!/\.(pdf|docx)$/i.test(candidate.name)) {
      setValidationError("Choose a PDF or DOCX file.");
      return;
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setValidationError("The file must be 10 MB or smaller.");
      return;
    }
    setValidationError("");
    setFile(candidate);
  }

  async function submit(event) {
    event.preventDefault();
    setValidationError("");
    if (!file) return setValidationError("Select a resume to continue.");
    if (jobDescription.trim().length < 30) {
      return setValidationError("Add a job description of at least 30 characters.");
    }
    await onAnalyze(file, jobDescription, weights);
  }

  return (
    <form className="upload-card" onSubmit={submit}>
      <div className="section-title">
        <div><span className="eyebrow">NEW ANALYSIS</span><h2>Start with a resume</h2></div>
        <span className="step-pill">01 / 02</span>
      </div>

      <div
        className={`drop-zone ${dragging ? "drop-zone-active" : ""} ${file ? "drop-zone-selected" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx" hidden onChange={(event) => chooseFile(event.target.files)} />
        <span className="upload-icon">{file ? <FileText size={22} /> : <UploadCloud size={22} />}</span>
        <div>
          <strong>{file ? file.name : "Drop your resume here"}</strong>
          <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze` : <>or <em>browse files</em> · PDF or DOCX, up to 10 MB</>}</span>
        </div>
        {file && <button type="button" className="clear-file" aria-label="Remove selected file" onClick={(event) => { event.stopPropagation(); setFile(null); }}>×</button>}
      </div>

      <label className="field-label" htmlFor="job-description">
        <span>Job description</span><span className="character-count">{jobDescription.length.toLocaleString()} / 50,000</span>
      </label>
      <textarea
        id="job-description"
        value={jobDescription}
        maxLength={50000}
        onChange={(event) => setJobDescription(event.target.value)}
        placeholder="Paste the role description, responsibilities, and qualifications…"
        rows={7}
      />

      <details className="weight-settings">
        <summary>Customize scoring weights <span>Defaults: 50 / 30 / 20</span></summary>
        <p>Weights are normalized to 100% before scoring.</p>
        {[
          ["relevance", "Job relevance"],
          ["ats", "ATS structure"],
          ["formatting", "Text formatting"]
        ].map(([key, label]) => (
          <label className="weight-row" key={key}>
            <span>{label}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={weights[key]}
              onChange={(event) => setWeights((current) => ({ ...current, [key]: Number(event.target.value) }))}
            />
            <strong>{weights[key]}%</strong>
          </label>
        ))}
        <div className="weight-total">Current input: {Object.values(weights).reduce((sum, item) => sum + item, 0)}% · normalized automatically</div>
      </details>

      {validationError && <p className="form-error" role="alert">{validationError}</p>}
      <button className="button button-primary analyze-button" type="submit" disabled={submitting}>
        {submitting ? <><span className="spinner" /> Analyzing resume…</> : "Analyze resume"}
      </button>
      <p className="privacy-hint">Your uploaded file is processed in memory; extracted text is saved with the analysis history.</p>
    </form>
  );
}

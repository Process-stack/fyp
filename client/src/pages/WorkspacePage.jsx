import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CircleHelp,
  FileCheck2,
  Layers3,
  ShieldCheck
} from "lucide-react";
import AnalysisResults from "../components/AnalysisResults.jsx";
import ComparePanel from "../components/ComparePanel.jsx";
import HistoryPanel from "../components/HistoryPanel.jsx";
import UploadForm from "../components/UploadForm.jsx";
import {
  compareAnalyses,
  deleteAnalysis,
  downloadReport,
  fetchAnalyses,
  fetchAnalysis,
  requestAdvisory,
  runFairness,
  submitAnalysis
} from "../services/api.js";

function App() {
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [busy, setBusy] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");

  const refreshHistory = useCallback(async () => {
    setHistory(await fetchAnalyses());
  }, []);

  useEffect(() => {
    refreshHistory().catch((requestError) => setError(requestError.message));
  }, [refreshHistory]);

  async function handleAnalyze(file, jobDescription, weights) {
    setBusy("analysis");
    setError("");
    try {
      const result = await submitAnalysis(file, jobDescription, weights);
      setAnalysis(result);
      setComparison(null);
      await refreshHistory();
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function openAnalysis(id) {
    setError("");
    try {
      setAnalysis(await fetchAnalysis(id));
      setComparison(null);
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function toggleCompare(id) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      return current.length < 2 ? [...current, id] : [current[1], id];
    });
  }

  async function handleCompare() {
    setBusy("compare");
    setError("");
    try {
      setComparison(await compareAnalyses(compareIds));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this saved analysis and its extracted resume text? This cannot be undone.")) return;
    setError("");
    try {
      await deleteAnalysis(id);
      await refreshHistory();
      setCompareIds((current) => current.filter((value) => value !== id));
      if (analysis?._id === id) setAnalysis(null);
      if (comparison?.some((item) => item._id === id)) setComparison(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleAction(action, request) {
    setBusyAction(action);
    setError("");
    try {
      const updated = await request(analysis._id);
      setAnalysis(updated);
      await refreshHistory();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Resume Lens home">
          <span className="brand-mark"><Layers3 size={20} /></span>
          <span>resume<span className="brand-light">lens</span><small>ANALYSIS STUDIO</small></span>
        </a>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item nav-item-active" href="#workspace"><Activity size={17} /> Workspace</a>
          <a className="nav-item" href="#history"><FileCheck2 size={17} /> Analysis history</a>
          <a className="nav-item" href="#fairness-info"><ShieldCheck size={17} /> Fairness & trust</a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-project">
          <span className="project-icon"><BriefcaseBusiness size={17} /></span>
          <div><strong>FYP project</strong><span>Deterministic · Explainable</span></div>
        </div>
        <a className="nav-item help-link" href="#fairness-info"><CircleHelp size={17} /> About this tool</a>
        <div className="sidebar-version">Prototype · v1.0</div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>Resume analysis</strong></div>
          <div className="topbar-right"><span className="status-indicator" /> Local-only workspace</div>
        </header>

        <div className="page-wrap" id="workspace">
          <section className="page-heading">
            <div>
              <span className="eyebrow">RESUME INTELLIGENCE WORKSPACE</span>
              <h1>Make every match <span>make sense.</span></h1>
              <p>Understand how a resume aligns with a role—with clear signals, evidence, and control.</p>
            </div>
            <div className="heading-badge"><ShieldCheck size={18} /><span>Explainable by design</span></div>
          </section>

          {error && <div className="global-error" role="alert"><span>{error}</span><button onClick={() => setError("")}>Dismiss</button></div>}

          <div className="workspace-grid">
            <div className="left-column">
              <UploadForm onAnalyze={handleAnalyze} submitting={busy === "analysis"} />
              <HistoryPanel
                items={history}
                selectedId={analysis?._id}
                compareIds={compareIds}
                loading={busy === "compare"}
                onOpen={openAnalysis}
                onToggleCompare={toggleCompare}
                onDelete={handleDelete}
                onCompare={handleCompare}
              />
              <ComparePanel analyses={comparison} onClose={() => setComparison(null)} />
            </div>
            <div className="right-column" id="results">
              <AnalysisResults
                analysis={analysis}
                busyAction={busyAction}
                onFairness={() => handleAction("fairness", runFairness)}
                onAdvisory={() => {
                  if (window.confirm("This sends the saved resume text and job description to the configured OpenAI API. Continue?")) {
                    handleAction("advisory", requestAdvisory);
                  }
                }}
                onReport={() => {
                  setError("");
                  downloadReport(analysis._id, analysis.filename).catch((requestError) => setError(requestError.message));
                }}
              />
            </div>
          </div>

          <footer className="page-footer" id="fairness-info">
            <div><ShieldCheck size={17} /><strong>Fairness note</strong></div>
            <p>The audit checks score sensitivity to masking a likely name line in the same resume. It does not measure demographic parity, detect protected traits, or prove fairness. This educational prototype is not a hiring decision system.</p>
            <span>Resume Lens · Explainable and Fair Resume Analysis</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;

import { ArrowUpRight, Clock3, Trash2 } from "lucide-react";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function HistoryPanel({ items, selectedId, compareIds, loading, onOpen, onToggleCompare, onDelete, onCompare }) {
  return (
    <section className="history-card" id="history">
      <div className="section-title">
        <div><span className="eyebrow">YOUR WORKSPACE</span><h2>Recent analyses</h2></div>
        <span className="history-count">{items.length} saved</span>
      </div>
      <p className="muted-copy">Select up to two analyses to compare their scores side by side.</p>
      {compareIds.length === 2 && (
        <button className="button button-secondary compare-button" disabled={loading} onClick={onCompare}>
          {loading ? "Comparing…" : "Compare selected"}
        </button>
      )}
      {items.length === 0 ? (
        <div className="history-empty"><Clock3 size={19} /><span>No saved analyses yet. Your results will appear here.</span></div>
      ) : (
        <div className="history-list">
          {items.map((item) => (
            <article className={`history-item ${selectedId === item._id ? "history-item-active" : ""}`} key={item._id}>
              <input
                type="checkbox"
                aria-label={`Select ${item.filename} for comparison`}
                checked={compareIds.includes(item._id)}
                onChange={() => onToggleCompare(item._id)}
              />
              <button className="history-open" onClick={() => onOpen(item._id)}>
                <span className="history-file">{item.filename}</span>
                <span className="history-date"><Clock3 size={12} /> {formatDate(item.createdAt)}</span>
              </button>
              <strong className="history-score">{item.score}<small>/100</small></strong>
              <button className="icon-button" aria-label={`Delete ${item.filename}`} title="Delete analysis" onClick={() => onDelete(item._id)}>
                <Trash2 size={15} />
              </button>
              <ArrowUpRight className="history-arrow" size={14} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

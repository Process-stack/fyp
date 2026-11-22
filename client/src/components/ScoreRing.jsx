export default function ScoreRing({ score, size = 148 }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" aria-label={`Overall score ${score} out of 100`}>
        <circle className="score-ring-track" cx="60" cy="60" r={radius} />
        <circle
          className="score-ring-value"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring-label">
        <strong>{score}</strong>
        <span>out of 100</span>
      </div>
    </div>
  );
}

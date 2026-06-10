interface Props {
  score: number;
  size?: number;
}

export default function ScoreRing({ score, size = 160 }: Props) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 75 ? '#39ff14' :
    score >= 50 ? '#f59e0b' :
    '#ef4444';

  const label =
    score >= 75 ? 'İyi' :
    score >= 50 ? 'Orta' :
    'Zayıf';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 120 120">
        {/* Track */}
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e1e2e" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease', filter: `drop-shadow(0 0 6px ${color})` }}
        />
        {/* Score text */}
        <text x="60" y="55" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="system-ui">
          {score}
        </text>
        <text x="60" y="72" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="system-ui">
          / 100
        </text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

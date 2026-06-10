interface CheckResult {
  id: string;
  title: string;
  passed: boolean;
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
}

interface Props {
  result: CheckResult;
  index: number;
}

export default function CheckCard({ result, index }: Props) {
  const pct = Math.round((result.score / result.maxScore) * 100);

  return (
    <div
      className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 animate-fade-in transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2a2a3e]"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: result.passed ? '#39ff14' : '#ef4444',
        animationDelay: `${index * 0.05}s`,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.45)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{result.title}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                result.passed
                  ? 'bg-[#39ff14]/10 text-[#39ff14]'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {result.passed ? 'Geçti' : 'Başarısız'}
            </span>
          </div>

          {/* Score bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  backgroundColor: result.passed ? '#39ff14' : pct > 50 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {result.score}/{result.maxScore}
            </span>
          </div>
        </div>
      </div>

      {/* Issues */}
      {result.issues.length > 0 && (
        <ul className="mt-3 space-y-1">
          {result.issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <span className="text-red-400 flex-shrink-0 mt-0.5">✕</span>
              <span className="font-mono break-all">{issue}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1e1e2e]">
          {result.suggestions.map((s, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-[#00d4ff]/80">
              <span className="flex-shrink-0 mt-0.5">💡</span>
              <span>{s}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

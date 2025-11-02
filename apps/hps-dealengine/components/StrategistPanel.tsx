'use client';

export default function StrategistPanel() {
  return (
    <aside className="panel p-4 rounded-2xl sticky top-[88px] h-fit">
      <div className="text-sm opacity-70 mb-2">DealEngine Strategist</div>
      <p className="text-sm leading-6 opacity-90">
        I use Orlando liquidity + your Sandbox settings to explain tradeoffs, risk posture, and
        suggested adjustments.
      </p>
      <div className="mt-4 text-xs opacity-70">
        Tip: Press <kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>/</kbd> to jump to Search. Try multiple
        presets (Aggressive / Neutral / Tight) and compare.
      </div>
    </aside>
  );
}


import React from 'react';

const MarketTempGauge: React.FC = () => {
  // Static market data to provide a consistent source of truth.
  const marketData = {
    temperature: 58,
    summary: 'Balanced market conditions observed.',
  };

  const temp = marketData.temperature;
  const rotation = -90 + (temp / 100) * 180;
  const color = 'text-cyan-300'; // Set to cyan as requested.

  const renderContent = () => {
    return (
      <>
        <div className={`text-3xl font-bold font-mono metric-glow ${color}`}>
          {marketData.temperature}
        </div>
        <div className={`text-xs font-semibold text-center ${color}`}>{marketData.summary}</div>
      </>
    );
  };

  return (
    <div className="card-icy flex flex-col items-center justify-center text-center h-full">
      <h4 className="label-xs uppercase mb-2">Central FL Market Temp</h4>
      <div className="relative w-48 h-24">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="8"
          />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="url(#tempGradient)"
            strokeWidth="8"
            strokeDasharray={`${(temp / 100) * 125.6} 125.6`}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-blue)" />
              <stop offset="50%" stopColor="var(--accent-green)" />
              <stop offset="100%" stopColor="var(--accent-orange)" />
            </linearGradient>
          </defs>
        </svg>
        <div
          className="absolute bottom-0 left-1/2 w-0.5 h-5 bg-text-primary origin-bottom transition-transform duration-500"
          style={{ transform: `translateX(-50%) translateX(-0.5px) rotate(${rotation}deg)` }}
        ></div>
      </div>
      {renderContent()}
    </div>
  );
};

export default MarketTempGauge;




'use client';

import { demoDeal } from './demo';
import Link from 'next/link';
import React, { useMemo, useState, useEffect, createContext, useContext, useCallback } from 'react';

/* ===== Types & helpers to satisfy TS ===== */
import type { ChangeEventHandler, ReactNode } from 'react';

/** Tabs context typing */
type TabsContextType = {
  activeTab: string;
  setActiveTab: (v: string) => void;
};

/** Flags typing for Compliance banners */
type Flag = { active?: boolean; message?: string };
type Flags = Record<string, Flag>;

/** Estimator types */
type EstimatorItem = {
  label: string;
  isPerUnit?: boolean;
  unitName?: string;
  options: Record<string, number>;
};
type EstimatorSectionDef = {
  title: string;
  icon: keyof typeof Icons;
  items: Record<string, EstimatorItem>;
};
type EstimatorCosts = Record<string, { condition: string; cost: number; notes: string }>;
type EstimatorState = {
  costs: Record<string, EstimatorCosts>;
  quantities: Record<string, number>;
};

/** Engine stub types (visual only) */
type EngineCalculations = {
  instantCashOffer: number;
  projectedPayoffClose: number;
  netToSeller: number;
  respectFloorPrice: number;
  buyerCeiling: number;
  dealSpread: number;
  urgencyBand: string;
  urgencyDays: number;
  listingAllowed: boolean;
  tenantBuffer: number;
  displayMargin: number;
  displayCont: number;
  carryMonths: number;
  maoFinal: number;
  totalRepairs: number;
  carryCosts: number;
  resaleCosts: number;
  repairs_with_contingency: number;
  resale_costs_total: number;
  commissionPct: number;
  capAIV: number;
  sellerNetRetail: number;
  marketTemp: number;
};
type EngineResult = {
  calculations: EngineCalculations;
  flags: Flags;
  state: string;
  missingInfo: string[];
};

/** Small UI component prop types */
type IconProps = { d: string; size?: number; className?: string };
type CardProps = { children: ReactNode; className?: string };
type BadgeProps = {
  color?: 'green' | 'blue' | 'orange' | 'red';
  children: ReactNode;
};
type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'danger' | 'ghost' | 'neutral';
  className?: string;
};
type SelectFieldProps = {
  label: string;
  value: any;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  children: ReactNode;
};
type InputFieldProps = {
  label: string;
  type?: string;
  value: any;
  onChange: ChangeEventHandler<HTMLInputElement>;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  disabled?: boolean;
  className?: string;
};
type ToggleSwitchProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
};

const GlobalStyles = () => (
  <style>{`
    :root {
      --bg-main: #000F22;
      --bg-glass: rgba(0, 24, 49, 0.5);
      --border-color: rgba(0, 150, 255, 0.2);
      --text-primary: #E0F2FF;
      --text-secondary: #99C5E3;
      --accent-blue: #0096FF;
      --accent-green: #00BF63;
      --accent-orange: #FF4500;
      --accent-red: #990000;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      --font-mono: 'Roboto Mono', monospace;
    }
    body {
      background-color: var(--bg-main);
      color: var(--text-primary);
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    @keyframes pulse {
      50% { opacity: .5; }
    }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .metric-glow { text-shadow: 0 0 8px rgba(0, 150, 255, 0.3), 0 0 12px rgba(0, 150, 255, 0.2); }
    .card-icy {
      background: var(--bg-glass);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      backdrop-filter: blur(12px);
      padding: 1rem;
    }
    .info-card {
      background: rgba(0, 36, 73, 0.4);
      border: 1px solid rgba(0, 150, 255, 0.15);
      border-radius: 8px;
      padding: 0.75rem;
    }
    .highlight-card {
      background: linear-gradient(90deg, rgba(0, 150, 255, 0.2) 0%, rgba(0, 150, 255, 0.05) 100%);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.75rem;
    }
    .card-orange {
      background: linear-gradient(90deg, #FF4500 0%, #cc3700 100%);
      border: 1px solid rgba(255, 69, 0, 0.33);
      border-radius: 8px;
    }
    .muted { color: var(--text-secondary); opacity: 0.7; }
    .label-xs { font-size: 0.7rem; font-weight: 600; color: var(--text-secondary); letter-spacing: 0.05em; }
    .tab-trigger {
      padding: 0.5rem 1rem; border-radius: 999px; font-size: 0.875rem; font-weight: 500;
      color: var(--text-secondary); transition: all 0.2s ease; border: 1px solid transparent;
    }
    .tab-trigger:hover { color: var(--text-primary); background-color: rgba(0, 150, 255, 0.1); }
    .tab-trigger.active {
      color: var(--text-primary); background-color: var(--accent-blue);
      border-color: var(--accent-blue); box-shadow: 0 2px 10px rgba(0, 150, 255, 0.3);
    }
    .dark-input, .dark-select {
      background-color: #001831; border: 1px solid #00386b; color: var(--text-primary);
      border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.875rem; width: 100%;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .dark-input:focus, .dark-select:focus {
      outline: none; border-color: var(--accent-blue);
      box-shadow: 0 0 0 2px rgba(0, 150, 255, 0.3);
    }
    .dark-select option { background-color: var(--bg-main); color: var(--text-primary); }
    .text-white { color: #FFFFFF; }
    .text-brand-red { color: #990000; }
    .text-brand-red-light { color: #f8b4b4; }
    .bg-brand-red-subtle { background-color: rgba(153, 0, 0, 0.2); }
    .border-brand-red-subtle { border-color: rgba(153, 0, 0, 0.3); }
    .bg-brand-red-zone { background-color: rgba(153, 0, 0, 0.25); }
    .text-accent-green { color: var(--accent-green); }
    .text-accent-orange { color: var(--accent-orange); }
    .text-accent-orange-light { color: #ff9b71; }
    .bg-accent-orange-subtle { background-color: rgba(255, 69, 0, 0.2); }
    .border-accent-orange-subtle { border-color: rgba(255, 69, 0, 0.3); }
    .flip-card { background-color: transparent; min-height: 105px; perspective: 1000px; cursor: pointer; }
    .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
    .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
    .flip-card-front, .flip-card-back {
      position: absolute; width: 100%; height: 100%;
      -webkit-backface-visibility: hidden; backface-visibility: hidden;
      display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
    }
    .flip-card-back { transform: rotateY(180deg); }
    .profit-flip .card-icy { background: #00142c !important; border: 1px solid #00386b !important; backdrop-filter: none !important; }
    .profit-flip .flip-card-front { background: #00142c !important; }
    .profit-flip .flip-card-back { background: #003d7a !important; }
    .profit-flip.flip-card { overflow: hidden; }

    .repairs-scope, .repairs-scope *:not(svg):not(path) { color: var(--text-primary); }
    .repairs-scope .muted, .repairs-scope .label-xs { color: var(--text-secondary); opacity: 0.8; }
    .repairs-scope table, .repairs-scope thead, .repairs-scope tbody, .repairs-scope th, .repairs-scope td { color: inherit; }
    .repairs-scope .card-icy, .repairs-scope .info-card, .repairs-scope .highlight-card { color: var(--text-primary); }
    .repairs-scope .dark-input, .repairs-scope .dark-select { color: var(--text-primary); background-color: #001831; border: 1px solid #00386b; }
    .repairs-scope .dark-input::placeholder { color: color-mix(in srgb, var(--text-secondary) 80%, transparent); }
    .repairs-scope .dark-select option { background-color: var(--bg-main); color: var(--text-primary); }
    .repairs-scope input:-webkit-autofill, .repairs-scope textarea:-webkit-autofill, .repairs-scope select:-webkit-autofill {
      -webkit-text-fill-color: var(--text-primary); -webkit-box-shadow: 0 0 0px 1000px #001831 inset; box-shadow: 0 0 0px 1000px #001831 inset;
    }
  `}</style>
);

const fmt$ = (n: any, max = 0) =>
  isFinite(n)
    ? Number(n).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: max,
      })
    : '—';

const num = (v: any, fallback = 0) => {
  const x = parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
  return isFinite(x) ? x : fallback;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const roundHeadline = (n: number) => (isFinite(n) ? Math.round(n / 100) * 100 : 0);

const getMockCalcs = (): EngineCalculations => ({
  instantCashOffer: NaN,
  projectedPayoffClose: NaN,
  netToSeller: NaN,
  respectFloorPrice: NaN,
  buyerCeiling: NaN,
  dealSpread: NaN,
  urgencyBand: '—',
  urgencyDays: 0,
  listingAllowed: true,
  tenantBuffer: 0,
  displayMargin: 0,
  displayCont: 0,
  carryMonths: 0,
  maoFinal: NaN,
  totalRepairs: 0,
  carryCosts: 0,
  resaleCosts: 0,
  repairs_with_contingency: 0,
  resale_costs_total: 0,
  commissionPct: 0,
  capAIV: NaN,
  sellerNetRetail: NaN,
  marketTemp: 72,
});

/* VISUAL-ONLY STUB */
const HPSEngine = (() => {
  const runEngine = (_dealWrapper: any): EngineResult => {
    const calculations = getMockCalcs();
    return {
      calculations: {
        ...calculations,
        repairs_with_contingency: calculations.repairs_with_contingency,
        resale_costs_total: calculations.resale_costs_total,
        commissionPct: calculations.commissionPct,
        capAIV: calculations.capAIV,
        urgencyDays: calculations.urgencyDays,
        listingAllowed: calculations.listingAllowed,
        displayMargin: calculations.displayMargin,
        displayCont: calculations.displayCont,
        sellerNetRetail: calculations.sellerNetRetail,
      },
      flags: {
        isListingAllowed: { active: false, message: '' },
        firpta: { active: false, withholding: 0, message: '' } as any,
        pace: { active: false, message: '' },
        sirs: { active: false, message: '' },
        flood50Rule: { active: false, message: '' },
        insurance: { active: false, message: '' },
        homestead: { active: false, message: '' },
        foreclosureSale: { active: false, message: '' },
        redemptionPeriod: { active: false, message: '' },
      } as Flags,
      state: 'ReadyForOffer',
      missingInfo: [],
    };
  };
  const useDealEngine = (deal: any) => React.useMemo<EngineResult>(() => runEngine(deal), [deal]);
  return { runEngine, useDealEngine };
})();

/* VISUAL-ONLY STUB */
const DoubleClose = (() => {
  const MOCK_DC_CALCS = {
    Deed_Stamps_AB: 0,
    Deed_Stamps_BC: 0,
    Title_AB: 0,
    Title_BC: 0,
    Other_AB: 0,
    Other_BC: 0,
    TF_Points_$: 0,
    DocStamps_Note: 0,
    Intangible_Tax: 0,
    Extra_Closing_Load: 0,
    Gross_Spread: NaN,
    Net_Spread_Before_Carry: NaN,
    Net_Spread_After_Carry: NaN,
    Carry_Daily: 0,
    Carry_Total: 0,
    Fee_Target_Threshold: 0,
    Fee_Target_Check: '—',
    Seasoning_Flag: 'OK',
    notes: ['County: Orange (deed rate 0.007)', 'Calculations stubbed for visual preview.'],
  };

  const computeDoubleClose = (_dc: any, _deal: any) => MOCK_DC_CALCS;

  const autofill = (dc: any, deal: any, _calc: any) => {
    const d = JSON.parse(JSON.stringify(dc || {}));
    if (!d.county) d.county = deal?.deal?.property?.county || 'Orange';
    if (!d.carry_basis) d.carry_basis = 'day';
    if (d.using_tf && !isFinite(num(d.tf_points_rate))) d.tf_points_rate = 0.02;

    if (!('pab' in d)) d.pab = NaN;
    if (!('pbc' in d)) d.pbc = NaN;

    if (!('title_ab' in d)) d.title_ab = 0;
    if (!('title_bc' in d)) d.title_bc = 0;
    if (!('other_ab' in d)) d.other_ab = 0;
    if (!('other_bc' in d)) d.other_bc = 0;

    return d;
  };

  return { computeDoubleClose, autofill };
})();

const Icons = {
  dollar: 'M12 1v22m-6-10h12',
  trending: 'M23 6l-9.5 9.5-5-5L1 18',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  wrench:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  calculator:
    'M19 12H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m14 0h-2m-2 0h-2m-2 0h-2m-2 0h-2m-2 0h-2',
  alert:
    'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01',
  playbook:
    'M2 6s1.5-2 5-2 5 2 5 2v14s-1.5-1-5-1-5 1-5 1V6zM22 6s-1.5-2-5-2-5 2-5 2v14s1.5-1 5-1 5 1 5 1V6z',
  lightbulb: 'M9 18h6M12 22V18M9 14h6M9 11h6M12 2a5 5 0 0 1 3 9H9a5 5 0 0 1 3-9z',
  check: 'M20 6L9 17l-5-5',
  briefcase: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
  barChart: 'M12 20V10m6 10V4M6 20v-4',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
};

const Icon = ({ d, size = 20, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d={d} />
  </svg>
);

const GlassCard = ({ children, className = '' }: CardProps) => (
  <div className={`card-icy ${className}`}>{children}</div>
);

const Badge = ({ color = 'blue', children }: BadgeProps) => {
  const colors: Record<string, string> = {
    green: 'bg-green-500/20 text-green-300 border border-green-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    orange: 'bg-accent-orange-subtle text-accent-orange-light border border-accent-orange-subtle',
    red: 'bg-brand-red-subtle text-brand-red-light border border-brand-red-subtle',
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.blue}`}
    >
      {children}
    </span>
  );
};

const Button = ({
  children,
  onClick,
  size = 'md',
  variant = 'primary',
  className = '',
}: ButtonProps) => {
  const sizes = { sm: 'px-2 py-1 text-xs', md: 'px-4 py-2 text-sm' };
  const variants: Record<string, string> = {
    primary: 'bg-accent-blue text-white hover:bg-blue-500',
    danger: 'bg-accent-red text-white hover:bg-red-500',
    ghost: 'text-blue-300 hover:bg-blue-500/10 hover:text-white',
    neutral: 'bg-gray-500/20 hover:bg-gray-500/30 text-white',
  };
  return (
    <button
      className={`font-semibold rounded-md transition-colors ${sizes[size]} ${variants[variant]} ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

/* ---------- Tabs (typed context with default) ---------- */
const TabsContext = createContext<TabsContextType>({
  activeTab: 'market',
  setActiveTab: () => {},
});

const NestedTabs = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState('market');
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabsContext.Provider>
  );
};
const NestedTabsList = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
const NestedTabsTrigger = ({
  children,
  value,
  className = '',
}: {
  children: ReactNode;
  value: string;
  className?: string;
}) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        isActive
          ? 'bg-accent-blue text-white'
          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
      } ${className}`}
      type="button"
    >
      {children}
    </button>
  );
};
const NestedTabsContent = ({ value, children }: { value: string; children: ReactNode }) => {
  const { activeTab } = useContext(TabsContext);
  return activeTab === value ? <div>{children}</div> : null;
};

/* ---------- Estimator sections (typed) ---------- */
const estimatorSections: Record<string, EstimatorSectionDef> = {
  exterior: {
    title: 'Exterior & Structural',
    icon: 'wrench',
    items: {
      roof: {
        label: 'Roof (Replacement)',
        isPerUnit: true,
        unitName: 'sq (100 sf)',
        options: {
          'Good (0–15 yrs)': 0,
          'Replace – Low ($525/sq)': 525,
          'Replace – Mid ($600/sq)': 600,
          'Replace – High ($675/sq)': 675,
        },
      },
      roofRepair: {
        label: 'Roof Repair',
        isPerUnit: true,
        unitName: 'repair',
        options: { None: 0, 'Minor Leak': 600, Moderate: 1700, Major: 3800 },
      },
      exteriorPaint: {
        label: 'Exterior Painting',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 2.0, Mid: 3.2, High: 5.5 },
      },
      windows: {
        label: 'Window Replacement',
        isPerUnit: true,
        unitName: 'window',
        options: {
          'All Intact': 0,
          'Replace – Low': 450,
          'Replace – Mid': 850,
          'Replace – High': 1400,
        },
      },
      siding: {
        label: 'Exterior Siding Replacement',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 5, Mid: 8, High: 12 },
      },
      landscaping: {
        label: 'Landscaping',
        options: {
          'Minimal Work': 0,
          'Cleanup & Trimming': 1200,
          'Full Sod/Clear': 3500,
        },
      },
    },
  },
  interior: {
    title: 'Interior Rooms & Finishes',
    icon: 'home',
    items: {
      interiorPaint: {
        label: 'Interior Painting',
        isPerUnit: true,
        unitName: 'sf (wall)',
        options: { None: 0, Low: 2.0, Mid: 3.0, High: 4.5 },
      },
      floorVinylLaminate: {
        label: 'Vinyl/Laminate Installation',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 3.5, Mid: 5.5, High: 8.5 },
      },
      floorHardwoodInstall: {
        label: 'Hardwood Installation',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 9, Mid: 13, High: 16 },
      },
      floorHardwoodRefinish: {
        label: 'Hardwood Refinishing',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 3.25, Mid: 4.25, High: 5.5 },
      },
      lightFixtures: {
        label: 'Lighting Fixtures',
        isPerUnit: true,
        unitName: 'fixture',
        options: {
          'All Functional/Modern': 0,
          'Replace – Std': 175,
          'Replace – Mid': 275,
          'Replace – Designer': 525,
        },
      },
    },
  },
  kitchenBath: {
    title: 'Kitchen & Bathrooms',
    icon: 'home',
    items: {
      kitchenFullRemodel: {
        label: 'Kitchen – Full Remodel',
        options: { None: 0, Low: 20000, Mid: 35000, High: 60000 },
      },
      kitchenCabinets: {
        label: 'Kitchen Cabinets',
        options: {
          None: 0,
          Good: 0,
          'Refinish/Paint': 3000,
          Replace: 12000,
        },
      },
      countertops: {
        label: 'Countertops',
        options: { None: 0, Good: 0, Laminate: 2200, 'Quartz/Granite': 5500 },
      },
      appliances: {
        label: 'Appliances',
        options: { 'None Needed': 0, 'Provide Stainless Package': 5500 },
      },
      bathrooms: {
        label: 'Bathrooms (Full Remodel)',
        options: { 'No Work': 0, 'Minor Update': 2500, 'Full Gut & Remodel': 8500 },
        isPerUnit: true,
        unitName: 'each',
      },
    },
  },
  systems: {
    title: 'Systems & Major Components',
    icon: 'wrench',
    items: {
      hvacAC: {
        label: 'AC Installation (Central)',
        options: { 'No Work': 0, Low: 7500, Mid: 11000, High: 15000 },
      },
      furnace: {
        label: 'Furnace Replacement',
        options: { 'No Work': 0, Low: 3500, Mid: 5500, High: 9000 },
      },
      waterHeater: {
        label: 'Water Heater',
        options: { '<10 Yrs Old': 0, 'Replace (10+ Yrs)': 1700 },
      },
      plumbingFixtures: {
        label: 'Plumbing – Fixture Replacement',
        isPerUnit: true,
        unitName: 'fixture',
        options: { None: 0, Basic: 175, Mid: 400, High: 1100 },
      },
      plumbing: {
        label: 'Plumbing (Supply/Drain)',
        options: { 'No Issues': 0, 'Leaks / Repairs Needed': 1500, 'Full Repipe': 8500 },
      },
      electricalRewire: {
        label: 'Electrical – Rewiring (Whole House)',
        options: { 'No Work': 0, Low: 7500, Mid: 12000, High: 17500 },
      },
      electricalPanel: {
        label: 'Electrical Panel',
        options: { 'Modern Breakers': 0, 'Update Needed (FPE/Zinsco)': 3500 },
      },
    },
  },
  structural: {
    title: 'Structural & Envelope',
    icon: 'wrench',
    items: {
      foundationRepair: {
        label: 'Foundation Repair',
        options: { None: 0, Low: 6000, Mid: 18000, High: 45000 },
      },
      drywallRepair: {
        label: 'Wall Repair (Drywall)',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, 'Minor Patches': 2.5, Moderate: 4, Extensive: 7 },
      },
    },
  },
};

/* ---------- Estimator state ---------- */
const createInitialEstimatorState = (): EstimatorState => {
  const state: EstimatorState = { costs: {}, quantities: {} };
  Object.keys(estimatorSections).forEach((sectionKey) => {
    state.costs[sectionKey] = {};
    const section = estimatorSections[sectionKey];
    Object.keys(section.items).forEach((itemKey) => {
      const item = section.items[itemKey];
      const firstCondition = Object.keys(item.options)[0];
      state.costs[sectionKey][itemKey] = {
        condition: firstCondition,
        cost: item.options[firstCondition] ?? 0,
        notes: '',
      };
      if (item.isPerUnit) state.quantities[itemKey] = 0;
    });
  });
  return state;
};

export default function GeminiApp({
  activeTab = 'overview',
}: {
  activeTab?: 'overview' | 'repairs' | 'underwrite';
}) {
  return (
    <div
      style={{ backgroundColor: '#000F22' }}
      className="min-h-screen font-sans text-text-primary"
    >
      <GlobalStyles />
      <AppInner initialTab={activeTab} />
    </div>
  );
}

function AppInner({ initialTab = 'overview' }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => setActiveTab(initialTab), [initialTab]);

  const [estimatorState, setEstimatorState] = useState<EstimatorState>(
    createInitialEstimatorState()
  );

  const [deal, setDeal] = useState<any>({
    deal: {
      market: {
        arv: '',
        as_is_value: '',
        dom_zip: 30,
        moi_zip: 2.5,
        'price-to-list-pct': 0.98,
        local_discount_20th_pct: 0.08,
        zip_discount_20pct: 0.08,
      },
      costs: {
        repairs_base: 0,
        contingency_pct: 0,
        monthly: {
          taxes: 4800,
          insurance: 1200,
          hoa: 0,
          utilities: 200,
          interest: 0,
        },
        sell_close_pct: 0.015,
        concessions_pct: 0.02,
        list_commission_pct: null,
        double_close: {
          county: 'Orange',
          property_type: 'SFR',
          association_present: 'No',
          type: 'Same-day',
          days_held: 0,
          same_day_order: 'No preference',
          pab: 0,
          title_ab: 0,
          other_ab: 0,
          owners_title_payer_ab: 'Unknown',
          pbc: 0,
          title_bc: 0,
          other_bc: 0,
          owners_title_payer_bc: 'Unknown',
          buyer_funds: 'Cash',
          lender_known: 'N/A',
          using_tf: false,
          tf_principal: 0,
          tf_points_rate: 0,
          tf_note_executed_fl: 'No',
          tf_secured: 'No',
          tf_extra_fees: 0,
          association_type: 'HOA',
          estoppel_fee: 0,
          rush_estoppel: 'No',
          transfer_fees: 0,
          board_approval: 'No',
          carry_amount: 0,
          carry_basis: 'day',
          arv_for_fee_check: 0,
          min_net_spread: 0,
          use_promulgated_estimates: 'No',
          assumed_owner_payer_ab: 'Unknown',
          assumed_owner_payer_bc: 'Unknown',
          show_items_math: true,
          show_fee_target: true,
          show_90d_flag: true,
          show_notes: true,
        },
      },
      debt: {
        senior_principal: '',
        senior_per_diem: '',
        good_thru_date: new Date().toISOString().split('T')[0],
        juniors: [],
        hoa_arrears: 0,
        muni_fines: 0,
        payoff_is_confirmed: true,
        protective_advances: 0,
        hoa_estoppel_fee: 0,
        pending_special_assessment: 0,
      },
      timeline: {
        days_to_sale_manual: 0,
        days_to_ready_list: 0,
        auction_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      property: {
        occupancy: 'owner',
        year_built: 1995,
        seller_is_foreign_person: false,
        stories: 2,
        is_coastal: false,
        system_failures: { roof: false },
        forms_current: true,
        flood_zone: false,
        old_roof_flag: false,
        county: 'Orange',
        is_homestead: false,
        is_foreclosure_sale: false,
        is_redemption_period_sale: false,
      },
      status: {
        insurability: 'bindable',
        open_permits_flag: false,
        major_system_failure_flag: false,
        structural_or_permit_risk_flag: false,
      },
      confidence: { score: 'A', notes: '', no_access_flag: false, reinstatement_proof_flag: true },
      title: { cure_cost: 0, risk_pct: 0 },
      policy: {
        safety_on_aiv_pct: 0.03,
        min_spread: 0,
        planned_close_days: 21,
        costs_are_annual: false,
        manual_days_to_money: null,
        assignment_fee_target: 0,
      },
      legal: { case_no: '2024-CA-012345', auction_date: '' },
      cma: {
        subject: { sqft: 2000, beds: 4, baths: 2, garage: 2, pool: 1 },
        adjKey: {
          perSqft: 100,
          perBed: 5000,
          perBath: 7500,
          perGarage: 10000,
          perCond: 15000,
          perPool: 20000,
          perMonth: -1000,
        },
        comps: [
          {
            id: 1,
            address: '',
            price: 495000,
            monthsAgo: 2,
            sqft: 1950,
            beds: 4,
            baths: 2,
            garage: 2,
            pool: 1,
            conditionDelta: 0,
            weight: 1,
          },
          {
            id: 2,
            address: '',
            price: 510000,
            monthsAgo: 3,
            sqft: 2100,
            beds: 4,
            baths: 2.5,
            garage: 2,
            pool: 1,
            conditionDelta: 0,
            weight: 0.8,
          },
          {
            id: 3,
            address: '',
            price: 480000,
            monthsAgo: 1,
            sqft: 2050,
            beds: 4,
            baths: 2,
            garage: 2,
            pool: 0,
            conditionDelta: -1,
            weight: 0.9,
          },
        ],
      },
    },
  });

  const loadDemo = () => {
    setDeal((prev: any) => ({
      ...prev,
      deal: {
        ...prev.deal,
        market: {
          ...prev.deal.market,
          arv: 520000,
          as_is_value: 420000,
        },
        costs: {
          ...prev.deal.costs,
          repairs_base: 28000,
        },
        debt: {
          ...prev.deal.debt,
          senior_principal: 350000,
          senior_per_diem: 95,
        },
      },
    }));
  };

  const setDealValue = useCallback((path: string, value: any) => {
    let validatedValue = value;
    const keys = path.split('.');
    const lastKey = keys[keys.length - 1];

    const rules = {
      nonNegative: [
        'arv',
        'as_is_value',
        'repairs_base',
        'senior_principal',
        'senior_per_diem',
        'protective_advances',
        'cure_cost',
        'hoa_estoppel_fee',
        'min_spread',
        'interest',
        'loan_origination_fee',
        'appraisal_fee',
        'assignment_fee_target',
        'title_policy_fee',
        'other_fees',
        'pab',
        'title_ab',
        'other_ab',
        'pbc',
        'title_bc',
        'other_bc',
        'tf_principal',
        'tf_points_rate',
        'tf_extra_fees',
        'estoppel_fee',
        'transfer_fees',
        'carry_amount',
        'arv_for_fee_check',
        'min_net_spread',
      ],
      percentage: [
        'price-to-list-pct',
        'local_discount_20th_pct',
        'sell_close_pct',
        'concessions_pct',
        'safety_on_aiv_pct',
        'risk_pct',
        'lender_points_pct',
      ],
      days: [
        'dom_zip',
        'days_to_sale_manual',
        'planned_close_days',
        'days_held',
        'manual_days_to_money',
      ],
      months: ['moi_zip'],
    };

    if (rules.nonNegative.includes(lastKey)) {
      validatedValue = Math.max(0, num(value));
    } else if (rules.percentage.includes(lastKey)) {
      validatedValue = clamp(num(value) / 100, 0, 1);
    } else if (rules.days.includes(lastKey)) {
      validatedValue =
        value === null || value === '' ? null : clamp(Math.round(num(value)), 0, 9999);
    } else if (rules.months.includes(lastKey)) {
      validatedValue = clamp(num(value), 0, 120);
    } else if (lastKey === 'list_commission_pct') {
      validatedValue = value === null || value === '' ? null : clamp(num(value) / 100, 0, 1);
    }

    setDeal((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let cur = next.deal;
      for (let i = 0; i < keys.length - 1; i++) {
        if (cur[keys[i]] === undefined) cur[keys[i]] = {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = validatedValue;
      return next;
    });
  }, []);

  const { calculations: calc, flags, missingInfo } = HPSEngine.useDealEngine(deal);

  const handleEstimatorCostChange = useCallback(
    (sectionKey: string, itemKey: string, field: 'condition' | 'cost' | 'notes', value: any) => {
      setEstimatorState((prev) => ({
        ...prev,
        costs: {
          ...prev.costs,
          [sectionKey]: {
            ...prev.costs[sectionKey],
            [itemKey]: {
              ...prev.costs[sectionKey][itemKey],
              [field]: field === 'cost' ? num(value) : value,
            },
          },
        },
      }));
    },
    []
  );

  const handleEstimatorQuantityChange = useCallback((itemKey: string, value: number) => {
    setEstimatorState((prev) => ({
      ...prev,
      quantities: { ...prev.quantities, [itemKey]: Math.max(0, num(value)) },
    }));
  }, []);

  const resetEstimator = useCallback(() => setEstimatorState(createInitialEstimatorState()), []);

  const totalRepairCostFromEstimator = useMemo(() => {
    let total = 0;
    Object.keys(estimatorSections).forEach((sectionKey) => {
      Object.entries(estimatorState.costs[sectionKey] || {}).forEach(([itemKey, { cost }]) => {
        const item = estimatorSections[sectionKey].items[itemKey];
        const q = item.isPerUnit ? (estimatorState.quantities[itemKey] ?? 0) : 1;
        total += num(cost) * q;
      });
    });
    return total;
  }, [estimatorState]);

  // Sync estimator total to deal state
  useEffect(() => {
    if (deal.deal.costs.repairs_base !== totalRepairCostFromEstimator) {
      setDealValue('costs.repairs_base', totalRepairCostFromEstimator);
    }
  }, [totalRepairCostFromEstimator, setDealValue, deal.deal.costs.repairs_base]);

  const hasUserInput = useMemo(() => {
    const d = deal.deal;
    return (
      (d.market?.arv !== '' && isFinite(num(d.market?.arv))) ||
      (d.costs?.repairs_base !== 0 && isFinite(num(d.costs?.repairs_base))) ||
      (d.debt?.senior_principal !== '' && isFinite(num(d.debt?.senior_principal))) ||
      (d.debt?.senior_per_diem !== '' && isFinite(num(d.debt?.senior_per_diem)))
    );
  }, [deal]);

  const tabs = [
    { id: 'overview', label: 'Overview', href: '/', icon: <Icon d={Icons.barChart} size={16} /> },
    {
      id: 'repairs',
      label: 'Repairs',
      href: '/repairs',
      icon: <Icon d={Icons.wrench} size={16} />,
    },
    {
      id: 'underwrite',
      label: 'Underwrite',
      href: '/underwrite',
      icon: <Icon d={Icons.edit} size={16} />,
    },
  ];

  return (
    <>
      <header className="px-4 sm:px-6 py-4 border-b border-white/10 sticky top-0 bg-bg-main/80 backdrop-blur-lg z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://www.haynespropertysolutions.com/wp-content/uploads/sites/4064/2025/09/cropped-Gemini_Generated_Image_dlof39dlof39dlof-Edited-Edited.png"
              alt="Haynes Property Solutions logo"
              className="h-10 w-auto"
            />
            <h1 className="text-xl font-bold text-white tracking-tight">HPS DealEngine™</h1>
          </div>

          <div className="flex items-center gap-4">
            <Badge color="green">Compliant</Badge>
            <Badge
              color={
                deal.deal.confidence.score === 'A'
                  ? 'green'
                  : deal.deal.confidence.score === 'B'
                    ? 'blue'
                    : 'orange'
              }
            >
              Confidence: {deal.deal.confidence.score || 'N/A'}
            </Badge>

            {/* ADD THIS BUTTON */}
            <Button size="sm" variant="neutral" onClick={loadDemo}>
              Load Demo
            </Button>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto mt-4 flex items-center gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`tab-trigger flex items-center gap-1.5 ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              {tab.icon} {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ComplianceAlerts flags={flags} missingInfo={missingInfo} show={hasUserInput} />
        <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
          <Overview deal={deal.deal} calc={calc} flags={flags} hasUserInput={hasUserInput} />
        </div>
        <div className={activeTab === 'repairs' ? 'block repairs-scope' : 'hidden'}>
          <RepairsPro
            deal={deal.deal}
            setDealValue={setDealValue}
            calc={calc}
            estimatorState={estimatorState}
            onCostChange={handleEstimatorCostChange}
            onQuantityChange={handleEstimatorQuantityChange}
            onReset={resetEstimator}
          />
        </div>
        <div className={activeTab === 'underwrite' ? 'block' : 'hidden'}>
          <UnderwriteTab deal={deal.deal} calc={calc} setDealValue={setDealValue} />
        </div>
      </main>
    </>
  );
}

const StatCard = ({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) => (
  <div className="card-icy p-3">
    <div className="flex items-center gap-2 label-xs">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-2xl font-bold text-white font-mono metric-glow mt-1">{value}</div>
  </div>
);

const getDealHealth = (spread: number, minSpread: number) => {
  if (!isFinite(spread)) return { label: 'Enter Data', color: 'blue' as const };
  if (spread >= minSpread) return { label: 'Healthy Spread', color: 'green' as const };
  if (spread >= 0) return { label: 'Below Minimum', color: 'orange' as const };
  return { label: 'Shortfall / Negative', color: 'red' as const };
};

const ComplianceAlerts = ({
  flags,
  missingInfo,
  show = true,
}: {
  flags: Flags;
  missingInfo: string[];
  show?: boolean;
}) => {
  if (!show) return null;
  const activeFlags = Object.values(flags || {}).filter(
    (flag) => typeof flag === 'object' && !!(flag as any)?.active
  ) as Flag[];
  if (missingInfo.length === 0 && activeFlags.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {missingInfo.length > 0 && (
        <div className="p-3 rounded-lg bg-brand-red-subtle border border-brand-red-subtle text-brand-red-light text-sm font-semibold flex items-center gap-2">
          <Icon d={Icons.alert} /> HOLD: Cannot generate a final offer. Missing critical info:{' '}
          {missingInfo.join(', ')}.
        </div>
      )}
      {activeFlags.map((flag, i) => (
        <div
          key={i}
          className="p-3 rounded-lg bg-accent-orange-subtle border border-accent-orange-subtle text-accent-orange-light text-sm font-semibold flex items-center gap-2"
        >
          <Icon d={Icons.alert} /> {flag.message}
        </div>
      ))}
    </div>
  );
};

const MarketTempGauge = ({ deal }: { deal: any }) => {
  const temp = HPSEngine.useDealEngine(deal).calculations.marketTemp;
  const rotation = -90 + (temp / 100) * 180;

  let label = 'Balanced';
  let color = 'text-yellow-400';
  if (temp <= 33) {
    label = "Buyer's Market";
    color = 'text-blue-400';
  } else if (temp >= 67) {
    label = "Seller's Market";
    color = 'text-accent-orange';
  }

  return (
    <div className="card-icy p-4 flex flex-col items-center justify-center text-center">
      <h4 className="label-xs uppercase mb-2">Central FL Market Temp</h4>
      <div className="relative w-40 h-20">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          {isFinite(temp) && (
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="url(#tempGradient)"
              strokeWidth="8"
              strokeDasharray={`${(temp / 100) * 125.6} 125.6`}
              strokeLinecap="round"
            />
          )}
          <defs>
            <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-blue)" />
              <stop offset="50%" stopColor="var(--accent-green)" />
              <stop offset="100%" stopColor="var(--accent-orange)" />
            </linearGradient>
          </defs>
        </svg>
        {isFinite(temp) && (
          <div
            className="absolute bottom-0 left-1/2 w-0.5 h-5 bg-white origin-bottom transition-transform duration-500"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
          />
        )}
      </div>
      <div className={`text-2xl font-bold font-mono metric-glow ${color}`}>
        {isFinite(temp) ? temp : '—'}
      </div>
      <div className={`text-xs font-semibold ${color}`}>{isFinite(temp) ? label : ''}</div>
    </div>
  );
};

const Overview = ({
  deal,
  calc,
  flags,
  hasUserInput,
}: {
  deal: any;
  calc: EngineCalculations;
  flags: Flags;
  hasUserInput: boolean;
}) => {
  const [isDoubleFlipped, setIsDoubleFlipped] = useState(false);

  const minSpread = num(deal.policy?.min_spread, 0);
  const isCashShortfall = hasUserInput && isFinite(calc.dealSpread) && calc.dealSpread < minSpread;
  const health = getDealHealth(calc.dealSpread, minSpread);
  const urgencyColors = {
    Emergency: 'red',
    Critical: 'orange',
    High: 'blue',
    Low: 'green',
    '—': 'blue',
  } as const;
  const playbookPoints = [
    !calc.listingAllowed &&
      'Property is currently uninsurable or has system failures, blocking a retail listing.',
    deal?.debt?.senior_per_diem > 0 &&
      calc.urgencyDays <= 30 &&
      `Seller burns ${fmt$(deal.debt.senior_per_diem)}/day — emphasize speed.`,
    deal?.property?.occupancy === 'tenant' &&
      `Tenant occupancy adds risk/delay — buffer of ${fmt$(calc.tenantBuffer, 0)} applied.`,
  ].filter(Boolean) as string[];

  const dcState = deal.costs.double_close;
  const dcCalcs = DoubleClose.computeDoubleClose(dcState, { deal });
  const dcTotalCosts = num(dcCalcs.Extra_Closing_Load) + num(dcCalcs.Carry_Total);

  const wholesaleFee =
    isFinite(calc.buyerCeiling) && isFinite(calc.respectFloorPrice)
      ? calc.buyerCeiling - calc.respectFloorPrice
      : NaN;
  const wholesaleFeeWithDC = isFinite(wholesaleFee) ? wholesaleFee - dcTotalCosts : NaN;

  return (
    <div className="space-y-4">
      {isCashShortfall && (
        <div className="card-orange p-3 text-white text-center font-semibold flex items-center justify-center gap-2 text-sm">
          <Icon d={Icons.alert} /> Cash (Shortfall): Offer is below minimum spread of{' '}
          {fmt$(minSpread, 0)}. Deficit: {fmt$(minSpread - calc.dealSpread, 0)}.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="After-Repair Value (ARV)"
          value={fmt$(roundHeadline(deal.market.arv))}
          icon={<Icon d={Icons.home} size={18} />}
        />
        <StatCard
          label="Buyer Ceiling"
          value={fmt$(roundHeadline(calc.buyerCeiling))}
          icon={<Icon d={Icons.trending} size={18} />}
        />
        <StatCard
          label="Respect Floor"
          value={fmt$(calc.respectFloorPrice)}
          icon={<Icon d={Icons.shield} size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="As-Is Value (AIV)"
          value={fmt$(roundHeadline(deal.market.as_is_value))}
          icon={<Icon d={Icons.shield} size={18} />}
        />
        <StatCard
          label="Wholesale Fee"
          value={fmt$(roundHeadline(wholesaleFee))}
          icon={<Icon d={Icons.dollar} size={18} />}
        />

        <div
          className={`flip-card profit-flip ${isDoubleFlipped ? 'flipped' : ''}`}
          onClick={() => setIsDoubleFlipped(!isDoubleFlipped)}
        >
          <div className="flip-card-inner">
            <div className="flip-card-front card-icy p-3">
              <span className="label-xs uppercase">Wholesale Fee w/ Double Close</span>
              <span className="text-2xl font-bold text-white font-mono metric-glow mt-1">
                {fmt$(wholesaleFeeWithDC, 0)}
              </span>
            </div>
            <div className="flip-card-back card-icy p-3">
              <span className="label-xs uppercase">Calculation</span>
              <span className="text-sm font-semibold text-white mt-1">
                (Ceiling - Floor) - DC Costs
              </span>
              <span className="text-xs muted">
                ({fmt$(wholesaleFee, 0)} - {fmt$(dcTotalCosts, 0)})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <GlassCard>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="text-white text-xl font-bold tracking-tight flex items-center gap-2">
                    <Icon d={Icons.shield} size={20} className="text-[#0096FF]" /> Deal Analysis
                  </h2>
                  {isFinite(calc.dealSpread) && <Badge color={health.color}>{health.label}</Badge>}
                  <Badge
                    color={urgencyColors[calc.urgencyBand as keyof typeof urgencyColors] ?? 'blue'}
                  >
                    {' '}
                    {calc.urgencyBand} {calc.urgencyDays > 0 ? `(${calc.urgencyDays}d)` : ''}{' '}
                  </Badge>
                  {!calc.listingAllowed && <Badge color="red">Listing Blocked</Badge>}
                </div>
                <div className="info-card">
                  <h4 className="label-xs uppercase mb-2 flex items-center gap-2">
                    <Icon d={Icons.lightbulb} size={16} /> Key Data
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-cyan-300/80">
                    <p>
                      <strong>Buyer Margin:</strong>{' '}
                      <span className="text-white font-mono">
                        {(calc.displayMargin * 100).toFixed(1)}%
                      </span>
                    </p>
                    <p>
                      <strong>Contingency:</strong>{' '}
                      <span className="text-white font-mono">
                        {(calc.displayCont * 100).toFixed(0)}%
                      </span>
                    </p>
                    <p>
                      <strong>Carry (calc):</strong>{' '}
                      <span className="text-white font-mono">
                        {calc.carryMonths > 0 ? calc.carryMonths.toFixed(2) + ' mos' : '—'}
                      </span>
                    </p>
                    <p>
                      <strong>Assignment Fee (Observed):</strong>{' '}
                      <span className="text-white font-mono">
                        {fmt$(calc.maoFinal - calc.instantCashOffer, 0)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 info-card space-y-2">
                <h4 className="label-xs uppercase text-center">Cost & Debt Snapshot</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-cyan-300">Repairs + Cont.</span>
                    <span className="font-semibold text-white">{fmt$(calc.totalRepairs)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-300">Carry Costs</span>
                    <span className="font-semibold text-white">{fmt$(calc.carryCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-300">Resale Costs</span>
                    <span className="font-semibold text-white">{fmt$(calc.resaleCosts)}</span>
                  </div>
                  <div className="border-t border-dashed border-white/20 my-1" />
                  <div className="flex justify-between text-brand-red">
                    <span>Projected Payoff</span>
                    <span className="font-semibold">{fmt$(calc.projectedPayoffClose)}</span>
                  </div>
                  {deal.property?.occupancy === 'tenant' && (
                    <div className="flex justify-between text-accent-orange">
                      <span>Tenant Buffer</span>
                      <span className="font-semibold text-white">{fmt$(calc.tenantBuffer)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
        <div>
          <MarketTempGauge deal={deal} />
        </div>
      </div>
      <DealStructureChart calc={calc} deal={deal} hasUserInput={hasUserInput} />
      <GlassCard>
        <h3 className="text-white font-semibold text-base mb-2 flex items-center gap-2">
          <Icon d={Icons.playbook} size={18} className="text-[#0096FF]" /> Negotiation Playbook
        </h3>
        {playbookPoints.length > 0 && hasUserInput ? (
          <ul className="space-y-2 text-sm text-cyan-300/80 list-disc pl-5">
            {playbookPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        ) : (
          <p className="muted text-sm">Enter deal data to generate negotiation points.</p>
        )}
      </GlassCard>
    </div>
  );
};

const DealStructureChart = ({
  calc,
  deal,
  hasUserInput,
}: {
  calc: EngineCalculations;
  deal: any;
  hasUserInput: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const tolerance = 500;

  const offer = calc?.instantCashOffer;
  const payoff = calc?.projectedPayoffClose;
  const floor = calc?.respectFloorPrice;
  const ceiling = calc?.buyerCeiling;
  const asIs = deal?.market?.as_is_value;
  const arv = deal?.market?.arv;

  const finiteVals = [0, payoff, floor, offer, ceiling, asIs, arv].filter((v) =>
    isFinite(v as number)
  ) as number[];
  const hardMin = finiteVals.length ? Math.min(...finiteVals) : 0;
  const hardMax = finiteVals.length ? Math.max(...finiteVals, hardMin + 1) : 1;
  const pad = Math.max(1, (hardMax - hardMin) * 0.05);
  const min = Math.min(0, hardMin - pad);
  const max = hardMax + pad;

  const toPct = (v: number) => {
    if (!isFinite(v) || max <= min) return 0;
    return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  };

  const belowFloor =
    isFinite(floor) && isFinite(offer) ? Math.max(0, (floor as number) - (offer as number)) : NaN;
  const showBelowFloor = isFinite(belowFloor) && (belowFloor as number) > tolerance;

  const negotiationLeft = toPct(showBelowFloor ? (floor as number) : (offer as number));
  const negotiationRight = toPct(offer as number);
  const headroomLeft = toPct(offer as number);
  const headroomRight = toPct(ceiling as number);

  const negotiationWidth =
    isFinite(negotiationRight) && isFinite(negotiationLeft)
      ? Math.max(0, negotiationRight - negotiationLeft)
      : 0;
  const headroomWidth =
    isFinite(headroomRight) && isFinite(headroomLeft)
      ? Math.max(0, headroomRight - headroomLeft)
      : 0;

  const gapToPayoff =
    isFinite(payoff) && isFinite(offer) ? (payoff as number) - (offer as number) : NaN;
  const window$ =
    isFinite(offer) && isFinite(floor) ? Math.max(0, (offer as number) - (floor as number)) : NaN;
  const headroom$ =
    isFinite(ceiling) && isFinite(offer)
      ? Math.max(0, (ceiling as number) - (offer as number))
      : NaN;

  const markers = [
    { label: 'Payoff', value: payoff, color: 'text-brand-red' },
    { label: 'Floor', value: floor, color: 'text-accent-orange' },
    { label: `Offer`, value: offer, color: 'text-yellow-300' },
    { label: 'As-Is', value: asIs, color: 'text-cyan-300' },
    { label: 'Ceiling', value: ceiling, color: 'text-blue-400' },
    { label: 'ARV', value: arv, color: 'text-green-400' },
  ]
    .filter((m) => isFinite(m.value as number))
    .map((m) => ({ ...m, pos: toPct(m.value as number) }))
    .sort((a, b) => a.pos - b.pos);

  const getStaggerLevel = (index: number) => {
    const level = index % 3;
    return level === 0 ? '-top-16' : level === 1 ? '-top-22' : '-top-10';
  };

  const buildSellerScript = () => {
    const parts: string[] = [];
    parts.push(`Based on today’s data, your payoff is ${fmt$(payoff, 0)}.`);
    parts.push(`Our cash offer pencils at ${fmt$(offer, 0)}.`);
    if (showBelowFloor) {
      parts.push(
        `That’s ${fmt$(belowFloor, 0)} below the respect floor from as-is and local discounts.`
      );
    } else if (isFinite(window$) && isFinite(headroom$)) {
      parts.push(
        `There’s ${fmt$(window$, 0)} of room to the floor and ${fmt$(headroom$, 0)} of buyer headroom above our offer.`
      );
    }
    if (isFinite(gapToPayoff) && (gapToPayoff as number) > 0) {
      parts.push(
        `We’re short of payoff by ${fmt$(gapToPayoff, 0)}; moving the closing earlier (per-diem) or trimming credits/scope helps.`
      );
    } else if (isFinite(gapToPayoff)) {
      parts.push(`This clears payoff with ${fmt$(-(gapToPayoff as number), 0)} cushion at close.`);
    }
    if (
      isFinite(calc.urgencyDays) &&
      calc.urgencyDays <= 14 &&
      isFinite(num(deal.debt.senior_per_diem)) &&
      num(deal.debt.senior_per_diem) > 0
    ) {
      parts.push(
        `With the auction so close, every day matters. Closing quickly provides significant per-diem relief for you.`
      );
    }
    return parts.join(' ');
  };
  const sellerScript = buildSellerScript();

  const copyScript = useCallback(() => {
    const textArea = document.createElement('textarea');
    textArea.value = sellerScript;
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
  }, [sellerScript]);

  return (
    <GlassCard>
      {copied && (
        <div className="fixed bottom-5 right-5 bg-green-600 text-white px-3 py-2 rounded-md shadow-lg z-50">
          Seller script copied
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-base">Deal Structure</h3>
        <Button size="sm" variant="ghost" onClick={copyScript} className="flex items-center gap-2">
          <Icon d={copied ? Icons.check : Icons.dollar} size={16} />
          {copied ? 'Copied!' : 'Copy Seller Script'}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-end gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-brand-red-zone rounded" />
            <span className="text-white/60">Below Floor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: 'rgba(255, 69, 0, 0.35)' }}
            />
            <span className="text-white/60">Negotiation Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500/30 rounded" />
            <span className="text-white/60">Buyer Headroom</span>
          </div>
        </div>

        <div className="relative w-full h-10 rounded-full bg-linear-to-r from-white/5 via-white/10 to-white/5 border border-white/15 shadow-inner overflow-hidden mb-16">
          <div
            className="absolute inset-y-0 left-0 bg-brand-red-zone group cursor-help transition-all duration-300 ease-in-out"
            style={{ width: `${negotiationLeft}%` }}
          >
            <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs rounded whitespace-nowrap z-50">
              Below Floor
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90" />
            </div>
          </div>
          <div
            className="absolute inset-y-0 group cursor-help transition-all duration-300 ease-in-out"
            style={{
              left: `${negotiationLeft}%`,
              width: `${negotiationWidth}%`,
              backgroundColor: 'rgba(255, 69, 0, 0.35)',
            }}
          >
            <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs rounded whitespace-nowrap z-50">
              Negotiation Window: {fmt$(window$, 0)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90" />
            </div>
          </div>
          <div
            className="absolute inset-y-0 bg-blue-500/30 group cursor-help transition-all duration-300 ease-in-out"
            style={{ left: `${headroomLeft}%`, width: `${headroomWidth}%` }}
          >
            <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs rounded whitespace-nowrap z-50">
              Buyer Headroom: {fmt$(headroom$, 0)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90" />
            </div>
          </div>

          {markers.map((m, i) => {
            const isOfferMarker = m.label.toLowerCase().includes('offer');
            const baseChip = 'backdrop-blur rounded';
            const chipClass = isOfferMarker
              ? `${baseChip} text-base font-extrabold px-3 py-1.5 bg-yellow-500/20 border-2 border-yellow-400`
              : `${baseChip} text-[10px] sm:text-[11px] md:text-xs font-semibold px-2 py-1 bg-black/60`;

            return (
              <div
                key={m.label}
                className={`absolute ${getStaggerLevel(
                  i
                )} -translate-x-1/2 flex flex-col items-center ${m.color} transition-all duration-300 ease-in-out`}
                style={{ left: `${m.pos}%` }}
              >
                <div className={chipClass}>
                  {m.label} · {fmt$(m.value as number, 0)}
                </div>
                <div className="mt-1 h-8 w-0.5 bg-current rounded-full" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="info-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-orange-subtle flex items-center justify-center shrink-0">
            <Icon d={Icons.trending} size={18} className="text-accent-orange" />
          </div>
          <div className="flex-1">
            <span className="label-xs block mb-0.5">Window (Floor→Offer)</span>
            <span className="font-semibold text-lg text-white">{fmt$(window$, 0)}</span>
          </div>
        </div>
        <div className="info-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <Icon d={Icons.dollar} size={18} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <span className="label-xs block mb-0.5">Headroom (Offer→Ceiling)</span>
            <span className="font-semibold text-lg text-white">{fmt$(headroom$, 0)}</span>
          </div>
        </div>
        <div
          className={`info-card flex items-center gap-3 ${
            isFinite(gapToPayoff) && (gapToPayoff as number) > 0 ? 'animate-pulse' : ''
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isFinite(gapToPayoff) && (gapToPayoff as number) > 0
                ? 'bg-accent-orange-subtle'
                : 'bg-green-500/20'
            }`}
          >
            <Icon
              d={isFinite(gapToPayoff) && (gapToPayoff as number) > 0 ? Icons.alert : Icons.check}
              size={18}
              className={
                isFinite(gapToPayoff) && (gapToPayoff as number) > 0
                  ? 'text-accent-orange-light'
                  : 'text-green-400'
              }
            />
          </div>
          <div className="flex-1">
            <span className="label-xs block mb-0.5">
              {isFinite(gapToPayoff) && (gapToPayoff as number) > 0
                ? 'Shortfall vs Payoff'
                : 'Cushion vs Payoff'}
            </span>
            <span className="font-semibold text-lg text-white">
              {fmt$(isFinite(gapToPayoff) ? Math.abs(gapToPayoff as number) : NaN, 0)}
            </span>
          </div>
        </div>
      </div>

      {hasUserInput && showBelowFloor && (
        <div className="mt-3 card-orange p-2 text-xs text-white text-center font-semibold">
          Offer is {fmt$(belowFloor, 0)} below Respect Floor — use the Scenario Modeler to move
          closing forward or trim credits/scope.
        </div>
      )}

      {!hasUserInput && (
        <p className="muted text-xs text-center mt-3">
          Enter deal data to populate the structure chart.
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-white/10">
        <h4 className="label-xs uppercase mb-2">Seller Script (Cash Offer)</h4>
        <p className="text-sm text-cyan-300/80 bg-black/30 p-3 rounded-md italic">
          "{sellerScript}"
        </p>
      </div>
    </GlassCard>
  );
};

const SelectField = ({ label, value, onChange, children }: SelectFieldProps) => (
  <div>
    <label className="block text-xs font-medium text-white/60 mb-1">{label}</label>
    <select value={value} onChange={onChange} className="dark-select">
      {children}
    </select>
  </div>
);

const RatesMetaBar = ({ asOf = '2025-10-18' }: { asOf?: string }) => (
  <div className="info-card flex items-center justify-between mb-2">
    <div className="label-xs">
      Repair unit rates — last update: <strong className="text-white/90">{asOf}</strong>
    </div>
    <div className="text-xs text-cyan-300/80">
      Sources: Homewyse (Oct 2025), plus current national guides.
    </div>
  </div>
);

const QuickEstimate = ({
  deal,
  setDealValue,
}: {
  deal: any;
  setDealValue: (path: string, value: any) => void;
}) => {
  const [rehabLevel, setRehabLevel] = useState<'none' | 'light' | 'medium' | 'heavy'>('none');
  const [big5, setBig5] = useState<Record<string, boolean>>({
    roof: false,
    hvac: false,
    repipe: false,
    electrical: false,
    foundation: false,
  });

  const quickEstimateTotal = useMemo(() => {
    const sqft = Math.max(0, num(deal.cma.subject.sqft));
    const psfRates: Record<string, number> = {
      none: 0,
      light: 25,
      medium: 40,
      heavy: 60,
    };
    const big5Rates: Record<string, number> = {
      roof: 6,
      hvac: 6,
      repipe: 5,
      electrical: 5.5,
      foundation: 15,
    };

    let total = sqft * (psfRates[rehabLevel] ?? 0);
    for (const item in big5) {
      if (big5[item]) {
        total += (big5Rates[item] || 0) * sqft;
      }
    }
    return total;
  }, [rehabLevel, big5, deal.cma.subject.sqft]);

  const toggle = (k: string) => setBig5((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <GlassCard>
      <h3 className="text-lg font-bold text-white mb-2">Quick Estimate Calculator</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Rehab Level (PSF Tiers)"
          value={rehabLevel}
          onChange={(e) => setRehabLevel(e.target.value as any)}
        >
          <option value="none">None ($0/sqft)</option>
          <option value="light">Light Cosmetic ($25/sqft)</option>
          <option value="medium">Medium / Full Rehab ($40/sqft)</option>
          <option value="heavy">Heavy Rehab ($60+/sqft)</option>
        </SelectField>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1">
            "Big 5" Budget Killers
          </label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 info-card p-2">
            {Object.keys(big5).map((item) => (
              <label
                key={item}
                className="flex items-center gap-2 text-sm capitalize text-cyan-300"
              >
                <input
                  type="checkbox"
                  checked={big5[item]}
                  onChange={() => toggle(item)}
                  className="h-4 w-4 rounded bg-cyan-700/40 border-cyan-500/50 text-cyan-400 focus:ring-cyan-500"
                />
                {item}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 p-3 info-card flex items-center justify-between">
        <div>
          <div className="label-xs">Quick Estimate Total</div>
          <div className="text-xl font-bold">{fmt$(quickEstimateTotal)}</div>
        </div>
        <Button size="sm" onClick={() => setDealValue('costs.repairs_base', quickEstimateTotal)}>
          Apply as Repair Budget
        </Button>
      </div>
    </GlassCard>
  );
};

function RepairsPro({
  deal,
  setDealValue,
  calc,
  estimatorState,
  onCostChange,
  onQuantityChange,
  onReset,
}: {
  deal: any;
  setDealValue: (path: string, value: any) => void;
  calc: EngineCalculations;
  estimatorState: EstimatorState;
  onCostChange: (
    sectionKey: string,
    itemKey: string,
    field: 'condition' | 'cost' | 'notes',
    value: any
  ) => void;
  onQuantityChange: (itemKey: string, value: number) => void;
  onReset: () => void;
}) {
  const { costs, quantities } = estimatorState;
  const ratesAsOf = '2025-10-18';

  const sectionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.keys(estimatorSections).forEach((sectionKey) => {
      totals[sectionKey] = Object.entries(costs[sectionKey] || {}).reduce(
        (acc, [itemKey, { cost }]) => {
          const item = estimatorSections[sectionKey].items[itemKey];
          const q = item.isPerUnit ? (quantities[itemKey] ?? 0) : 1;
          return acc + num(cost) * q;
        },
        0
      );
    });
    return totals;
  }, [costs, quantities]);
  const totalRepairCost = useMemo(
    () => Object.values(sectionTotals).reduce((acc, n) => acc + n, 0),
    [sectionTotals]
  );

  return (
    <div className="space-y-4">
      <RatesMetaBar asOf={ratesAsOf} />
      <QuickEstimate deal={deal} setDealValue={setDealValue} />
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icon d={Icons.wrench} size={18} className="text-[#0096FF]" /> Detailed Repairs
            Estimator
          </h2>
          <Button size="sm" variant="ghost" onClick={onReset}>
            Reset Detailed
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.keys(estimatorSections).map((key) => (
            <div key={key} className="info-card">
              <div className="flex items-center gap-2 label-sm mb-0.5">
                <Icon d={Icons[estimatorSections[key].icon]} size={14} className="text-[#0096FF]" />
                <span>{estimatorSections[key].title}</span>
              </div>
              <div className="text-base font-semibold">{fmt$(sectionTotals[key])}</div>
            </div>
          ))}
          <div className="highlight-card col-span-2 md:grid-cols-4 flex justify-between items-center">
            <div className="text-sm text-cyan-300 font-bold">DETAILED REPAIR SUBTOTAL</div>
            <div className="text-lg font-extrabold">{fmt$(totalRepairCost)}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-cyan-300/80">
          Contingency auto-sets from risk. Final Repairs w/ Contingency:{' '}
          <span className="font-bold text-white">{fmt$(calc.repairs_with_contingency)}</span>
        </div>
      </GlassCard>
      {Object.keys(estimatorSections).map((sectionKey) => (
        <EstimatorSection
          key={sectionKey}
          sectionKey={sectionKey}
          section={estimatorSections[sectionKey]}
          costs={estimatorState.costs[sectionKey]}
          quantities={quantities}
          onCostChange={(itemKey, field, value) => onCostChange(sectionKey, itemKey, field, value)}
          onQuantityChange={onQuantityChange}
        />
      ))}
    </div>
  );
}

function EstimatorSection({
  sectionKey,
  section,
  costs,
  quantities,
  onCostChange,
  onQuantityChange,
}: {
  sectionKey: string;
  section: EstimatorSectionDef;
  costs: EstimatorCosts;
  quantities: Record<string, number>;
  onCostChange: (itemKey: string, field: 'condition' | 'cost' | 'notes', value: any) => void;
  onQuantityChange: (itemKey: string, value: number) => void;
}) {
  return (
    <GlassCard>
      <h3 className="text-base font-bold text-white mb-2">{section.title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className="text-left p-2 label-xs">Item</th>
              <th className="text-left p-2 label-xs w-1/4">Condition / Tier</th>
              <th className="text-left p-2 label-xs w-1/5">Notes</th>
              <th className="text-right p-2 label-xs w-[120px]">Qty</th>
              <th className="text-right p-2 label-xs w-1/5">Unit Cost</th>
            </tr>
          </thead>
          <tbody>
            {costs &&
              Object.keys(section.items).map((itemKey) => (
                <EstimatorRow
                  key={itemKey}
                  itemKey={itemKey}
                  item={section.items[itemKey]}
                  value={costs[itemKey]}
                  quantity={quantities[itemKey]}
                  onValueChange={(field, value) => onCostChange(itemKey, field as any, value)}
                  onQuantityChange={onQuantityChange}
                />
              ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function EstimatorRow({
  itemKey,
  item,
  value,
  quantity,
  onValueChange,
  onQuantityChange,
}: {
  itemKey: string;
  item: EstimatorItem;
  value:
    | {
        condition: string;
        cost: number;
        notes: string;
      }
    | undefined;
  quantity: number | undefined;
  onValueChange: (itemKey: string, field: 'condition' | 'cost' | 'notes', value: any) => void;
  onQuantityChange: (itemKey: string, value: number) => void;
}) {
  const currentCondition = value?.condition || Object.keys(item.options)[0];
  const currentCost = value?.cost ?? item.options[currentCondition] ?? 0;
  const currentNotes = value?.notes || '';

  const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    const cost = item.options[selected];
    onValueChange(itemKey, 'condition', selected);
    onValueChange(itemKey, 'cost', cost);
  };
  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="p-2 font-semibold">{item.label}</td>
      <td className="p-2">
        <select value={currentCondition} onChange={handleOptionChange} className="dark-select">
          {Object.keys(item.options).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <input
          type="text"
          value={currentNotes}
          onChange={(e) => onValueChange(itemKey, 'notes', e.target.value)}
          placeholder="Specifics..."
          className="dark-input"
        />
      </td>
      <td className="p-2">
        <div className="flex items-center justify-end gap-2">
          {item.isPerUnit ? (
            <input
              type="number"
              min={0}
              value={quantity ?? 0}
              onChange={(e) => onQuantityChange(itemKey, num(e.target.value))}
              className="w-16 text-right dark-input"
              placeholder="0"
            />
          ) : (
            <span className="muted text-right w-full block pr-2">—</span>
          )}
          {item.unitName ? (
            <span className="text-xs muted w-14 text-left">{item.unitName}</span>
          ) : null}
        </div>
      </td>
      <td className="p-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-sm text-white/40">
            $
          </span>
          <input
            type="number"
            value={currentCost}
            onChange={(e) => onValueChange(itemKey, 'cost', Math.max(0, num(e.target.value)))}
            className="dark-input pl-5 text-right font-semibold"
            placeholder={item.isPerUnit ? 'Unit $' : 'Total $'}
          />
        </div>
      </td>
    </tr>
  );
}

const InputField = ({
  label,
  type = 'text',
  value,
  onChange,
  prefix,
  suffix,
  className = '',
  ...props
}: InputFieldProps) => (
  <div>
    <label className="block text-xs font-medium text-white/70 mb-1">{label}</label>
    <div className="relative">
      {prefix && (
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm text-white/40">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={`dark-input ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-12' : ''} ${className}`}
        {...props}
      />
      {suffix && (
        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-white/40">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const ToggleSwitch = ({ label, checked, onChange }: ToggleSwitchProps) => (
  <label className="flex items-center justify-between cursor-pointer">
    <span className="text-sm text-white">{label}</span>
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <div
        className={`block w-10 h-6 rounded-full ${checked ? 'bg-accent-blue' : 'bg-gray-600'}`}
      />
      <div
        className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
          checked ? 'transform translate-x-4' : ''
        }`}
      />
    </div>
  </label>
);

const ScenarioModeler = ({ deal }: { deal: any }) => {
  const [scenarioDays, setScenarioDays] = useState(deal.policy?.manual_days_to_money ?? '');
  const [scenarioRepairs, setScenarioRepairs] = useState(deal.costs?.repairs_base ?? 0);
  const [scenarioConcessions, setScenarioConcessions] = useState(
    (deal.costs?.concessions_pct ?? 0) * 100
  );

  const scenarioResult = useMemo(() => {
    const scenarioDealData = JSON.parse(JSON.stringify(deal));
    scenarioDealData.policy.manual_days_to_money = scenarioDays === '' ? null : num(scenarioDays);
    scenarioDealData.costs.repairs_base = num(scenarioRepairs);
    scenarioDealData.costs.concessions_pct = num(scenarioConcessions) / 100;
    return HPSEngine.runEngine({ deal: scenarioDealData });
  }, [deal, scenarioDays, scenarioRepairs, scenarioConcessions]);

  const { calculations: scenarioCalc } = scenarioResult;
  const { calculations: originalCalc } = HPSEngine.useDealEngine({ deal });

  const renderDelta = (
    original: number,
    scenario: number,
    formatter: (v: number) => ReactNode = (v) => fmt$(v, 0)
  ) => {
    const delta = isFinite(scenario) && isFinite(original) ? scenario - original : NaN;
    if (!isFinite(delta) || Math.abs(delta) < 0.01) return <span className="text-white/70">—</span>;

    const color = delta > 0 ? 'text-accent-green' : 'text-accent-orange';
    const sign = delta > 0 ? '+' : '';
    return (
      <span className={color}>
        {sign}
        {formatter(delta)}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 space-y-4">
        <h3 className="font-semibold text-white">Model Scenario</h3>
        <InputField
          label="Force Days to Money"
          type="number"
          value={scenarioDays}
          onChange={(e) => setScenarioDays(e.target.value)}
          placeholder="e.g., 14"
          suffix="days"
        />
        <InputField
          label="Adjust Repair Budget"
          type="number"
          prefix="$"
          value={scenarioRepairs}
          onChange={(e) => setScenarioRepairs(Number(e.target.value) || 0)}
        />
        <InputField
          label="Adjust Seller Concessions"
          type="number"
          suffix="%"
          value={scenarioConcessions}
          onChange={(e) => setScenarioConcessions(Number(e.target.value) || 0)}
        />
      </div>
      <div className="md:col-span-2 info-card p-4">
        <h3 className="font-semibold text-white mb-3">Scenario Outcome vs. Current</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left pb-2 label-xs">Metric</th>
              <th className="text-right pb-2 label-xs">Current Deal</th>
              <th className="text-right pb-2 label-xs">Scenario</th>
              <th className="text-right pb-2 label-xs">Delta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 font-semibold">Instant Cash Offer</td>
              <td className="py-2 text-right font-mono">
                {fmt$(originalCalc.instantCashOffer, 0)}
              </td>
              <td className="py-2 text-right font-mono font-bold text-lg text-yellow-300">
                {fmt$(scenarioCalc.instantCashOffer, 0)}
              </td>
              <td className="py-2 text-right font-mono">
                {renderDelta(originalCalc.instantCashOffer, scenarioCalc.instantCashOffer)}
              </td>
            </tr>
            <tr className="border-t border-white/10">
              <td className="py-2 font-semibold">Net to Seller</td>
              <td className="py-2 text-right font-mono">{fmt$(originalCalc.netToSeller, 0)}</td>
              <td className="py-2 text-right font-mono font-bold text-lg text-yellow-300">
                {fmt$(scenarioCalc.netToSeller, 0)}
              </td>
              <td className="py-2 text-right font-mono">
                {renderDelta(originalCalc.netToSeller, scenarioCalc.netToSeller)}
              </td>
            </tr>
            <tr className="border-t border-white/10">
              <td className="py-2 font-semibold text-white/70">Days to Money</td>
              <td className="py-2 text-right font-mono text-white/70">
                {originalCalc.urgencyDays > 0 ? `${originalCalc.urgencyDays}d` : '—'}
              </td>
              <td className="py-2 text-right font-mono text-white/70">
                {scenarioCalc.urgencyDays > 0 ? `${scenarioCalc.urgencyDays}d` : '—'}
              </td>
              <td className="py-2 text-right font-mono">
                {renderDelta(
                  originalCalc.urgencyDays,
                  scenarioCalc.urgencyDays,
                  (v) => `${Math.round(v)}d`
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UnderwriteTab = ({
  deal,
  calc,
  setDealValue,
}: {
  deal: any;
  calc: EngineCalculations;
  setDealValue: (path: string, value: any) => void;
}) => {
  const addJuniorLien = () => {
    const newLien = {
      id: Date.now(),
      type: 'Judgment',
      balance: '',
      per_diem: '',
      good_thru: '',
    };
    setDealValue('debt.juniors', [...deal.debt.juniors, newLien]);
  };
  const updateJuniorLien = (index: number, field: string, value: any) => {
    let validatedValue = value;
    if (['balance', 'per_diem'].includes(field)) {
      validatedValue = value === '' ? '' : Math.max(0, num(value));
    }
    const updatedJuniors = [...deal.debt.juniors];
    if (!updatedJuniors[index]) updatedJuniors[index] = {};
    updatedJuniors[index][field] = validatedValue;
    setDealValue('debt.juniors', updatedJuniors);
  };

  return (
    <GlassCard>
      <h2 className="text-lg font-bold text-white mb-4">Underwrite Deal</h2>
      <NestedTabs>
        <NestedTabsList className="border-b border-white/10 pb-3 mb-3">
          <NestedTabsTrigger value="market">Market & Valuation</NestedTabsTrigger>
          <NestedTabsTrigger value="property">Property & Risk</NestedTabsTrigger>
          <NestedTabsTrigger value="debt">Debt & Liens</NestedTabsTrigger>
          <NestedTabsTrigger value="policy">Policy & Fees</NestedTabsTrigger>
          <NestedTabsTrigger value="legal">Legal & Timeline</NestedTabsTrigger>
          <NestedTabsTrigger value="scenarios">Scenarios</NestedTabsTrigger>
          <NestedTabsTrigger value="double_close">HPS Double Closing Cost</NestedTabsTrigger>
        </NestedTabsList>
        <NestedTabsContent value="market">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <InputField
              label="ARV"
              type="number"
              prefix="$"
              value={deal.market.arv || ''}
              onChange={(e) => setDealValue('market.arv', e.target.value)}
            />
            <InputField
              label="As-Is Value"
              type="number"
              prefix="$"
              value={deal.market.as_is_value || ''}
              onChange={(e) => setDealValue('market.as_is_value', e.target.value)}
            />
            <InputField
              label="DOM (Zip)"
              type="number"
              suffix="days"
              value={deal.market.dom_zip || ''}
              onChange={(e) => setDealValue('market.dom_zip', e.target.value)}
            />
            <InputField
              label="MOI (Zip)"
              type="number"
              suffix="mos"
              value={deal.market.moi_zip || ''}
              onChange={(e) => setDealValue('market.moi_zip', e.target.value)}
            />
            <InputField
              label="Price-to-List %"
              type="number"
              suffix="%"
              value={(deal.market['price-to-list-pct'] ?? 0.98) * 100}
              onChange={(e) => setDealValue('market.price-to-list-pct', e.target.value)}
            />
            <InputField
              label="Local Discount (20th %)"
              type="number"
              suffix="%"
              value={(deal.market.local_discount_20th_pct ?? 0.08) * 100}
              onChange={(e) => setDealValue('market.local_discount_20th_pct', e.target.value)}
            />
          </div>
        </NestedTabsContent>
        <NestedTabsContent value="property">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="space-y-3">
              <SelectField
                label="Occupancy"
                value={deal.property.occupancy}
                onChange={(e) => setDealValue('property.occupancy', e.target.value)}
              >
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
                <option value="vacant">Vacant</option>
              </SelectField>
              <SelectField
                label="Insurance Bindability"
                value={deal.status.insurability}
                onChange={(e) => setDealValue('status.insurability', e.target.value)}
              >
                <option value="bindable">Bindable</option>
                <option value="conditional">Conditional</option>
                <option value="unbindable">Unbindable</option>
              </SelectField>
              <InputField
                label="County"
                value={deal.property.county}
                onChange={(e) => setDealValue('property.county', e.target.value)}
              />
            </div>
            <div className="info-card space-y-3 p-4">
              <ToggleSwitch
                label="No Interior Access"
                checked={deal.confidence.no_access_flag}
                onChange={() =>
                  setDealValue('confidence.no_access_flag', !deal.confidence.no_access_flag)
                }
              />
              <ToggleSwitch
                label="Structural/Permit/WDO Risk"
                checked={deal.status.structural_or_permit_risk_flag}
                onChange={() =>
                  setDealValue(
                    'status.structural_or_permit_risk_flag',
                    !deal.status.structural_or_permit_risk_flag
                  )
                }
              />
              <ToggleSwitch
                label="Old Roof (>20 years)"
                checked={deal.property.old_roof_flag}
                onChange={() =>
                  setDealValue('property.old_roof_flag', !deal.property.old_roof_flag)
                }
              />
            </div>
            <div className="info-card space-y-3 p-4">
              <ToggleSwitch
                label="Major System Failure"
                checked={deal.status.major_system_failure_flag}
                onChange={() =>
                  setDealValue(
                    'status.major_system_failure_flag',
                    !deal.status.major_system_failure_flag
                  )
                }
              />
              <ToggleSwitch
                label="Reinstatement Proof"
                checked={deal.confidence.reinstatement_proof_flag}
                onChange={() =>
                  setDealValue(
                    'confidence.reinstatement_proof_flag',
                    !deal.confidence.reinstatement_proof_flag
                  )
                }
              />
              <ToggleSwitch
                label="Homestead Status"
                checked={deal.property.is_homestead}
                onChange={() => setDealValue('property.is_homestead', !deal.property.is_homestead)}
              />
            </div>
          </div>
        </NestedTabsContent>
        <NestedTabsContent value="debt">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 border-b border-white/10 pb-3 mb-3 items-end">
            <InputField
              label="Senior Principal"
              type="number"
              prefix="$"
              value={deal.debt.senior_principal || ''}
              onChange={(e) => setDealValue('debt.senior_principal', e.target.value)}
            />
            <InputField
              label="Senior Per Diem"
              type="number"
              prefix="$"
              min={0}
              value={deal.debt.senior_per_diem || ''}
              onChange={(e) => setDealValue('debt.senior_per_diem', e.target.value)}
            />
            <InputField
              label="Payoff Good-Thru"
              type="date"
              value={deal.debt.good_thru_date}
              onChange={(e) => setDealValue('debt.good_thru_date', e.target.value)}
            />
            <ToggleSwitch
              label="Payoff Confirmed"
              checked={deal.debt.payoff_is_confirmed}
              onChange={() =>
                setDealValue('debt.payoff_is_confirmed', !deal.debt.payoff_is_confirmed)
              }
            />
            <InputField
              label="Protective Advances"
              type="number"
              prefix="$"
              min={0}
              value={deal.debt.protective_advances || ''}
              onChange={(e) => setDealValue('debt.protective_advances', e.target.value)}
            />
            <InputField
              label="Title Cure Cost"
              type="number"
              prefix="$"
              min={0}
              value={deal.title.cure_cost || ''}
              onChange={(e) => setDealValue('title.cure_cost', e.target.value)}
            />
            <InputField
              label="Title Risk %"
              type="number"
              suffix="%"
              min={0}
              max={3}
              value={(deal.title.risk_pct || 0) * 100}
              onChange={(e) => setDealValue('title.risk_pct', e.target.value)}
            />
            <InputField
              label="HOA Estoppel Fee"
              type="number"
              prefix="$"
              min={0}
              value={deal.debt.hoa_estoppel_fee || ''}
              onChange={(e) => setDealValue('debt.hoa_estoppel_fee', e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="label-xs uppercase">Junior Liens</h4>
            <Button size="sm" variant="neutral" onClick={addJuniorLien}>
              + Add Lien
            </Button>
          </div>
          <div className="space-y-2">
            {deal.debt.juniors &&
              deal.debt.juniors.map((lien: any, index: number) => (
                <div
                  key={lien.id || index}
                  className="info-card grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 items-end"
                >
                  <InputField
                    label="Type"
                    placeholder="HELOC, etc"
                    value={lien.type || ''}
                    onChange={(e) => updateJuniorLien(index, 'type', e.target.value)}
                  />
                  <InputField
                    label="Balance"
                    type="number"
                    prefix="$"
                    value={lien.balance || ''}
                    onChange={(e) => updateJuniorLien(index, 'balance', e.target.value)}
                  />
                  <InputField
                    label="Per Diem"
                    type="number"
                    prefix="$"
                    value={lien.per_diem || ''}
                    onChange={(e) => updateJuniorLien(index, 'per_diem', e.target.value)}
                  />
                  <InputField
                    label="Good-Thru"
                    type="date"
                    value={lien.good_thru || ''}
                    onChange={(e) => updateJuniorLien(index, 'good_thru', e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    className="h-[38px] w-full"
                    onClick={() =>
                      setDealValue(
                        'debt.juniors',
                        deal.debt.juniors.filter((_: any, i: number) => i !== index)
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
          </div>
        </NestedTabsContent>
        <NestedTabsContent value="policy">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <InputField
              label="Assignment Fee Target"
              type="number"
              prefix="$"
              value={deal.policy.assignment_fee_target || ''}
              onChange={(e) => setDealValue('policy.assignment_fee_target', e.target.value)}
              placeholder="Optional"
            />
            <InputField
              label="List Commission Override %"
              type="number"
              suffix="%"
              value={
                deal.costs.list_commission_pct != null ? deal.costs.list_commission_pct * 100 : ''
              }
              onChange={(e) =>
                setDealValue(
                  'costs.list_commission_pct',
                  e.target.value === '' ? null : e.target.value
                )
              }
              placeholder={String((calc.commissionPct * 100).toFixed(1))}
            />
            <InputField
              label="Sell Close Costs %"
              type="number"
              suffix="%"
              value={(deal.costs.sell_close_pct ?? 0.015) * 100}
              onChange={(e) => setDealValue('costs.sell_close_pct', e.target.value)}
              min={0}
              max={30}
              step={0.1}
            />
            <InputField
              label="Seller Concessions %"
              type="number"
              suffix="%"
              value={(deal.costs.concessions_pct ?? 0.02) * 100}
              onChange={(e) => setDealValue('costs.concessions_pct', e.target.value)}
              min={0}
              max={30}
              step={0.1}
            />
            <InputField
              label="Safety Margin on AIV %"
              type="number"
              suffix="%"
              value={(deal.policy.safety_on_aiv_pct ?? 0.03) * 100}
              onChange={(e) => setDealValue('policy.safety_on_aiv_pct', e.target.value)}
              min={0}
              max={10}
              step={0.1}
            />
            <InputField
              label="Min Spread"
              type="number"
              prefix="$"
              value={deal.policy.min_spread || ''}
              onChange={(e) => setDealValue('policy.min_spread', e.target.value)}
            />
            <InputField
              label="Monthly Interest"
              type="number"
              prefix="$"
              min={0}
              value={deal.costs.monthly.interest || ''}
              onChange={(e) => setDealValue('costs.monthly.interest', e.target.value)}
            />
            <ToggleSwitch
              label="Costs Are Annual"
              checked={deal.policy.costs_are_annual}
              onChange={() =>
                setDealValue('policy.costs_are_annual', !deal.policy.costs_are_annual)
              }
            />
          </div>
        </NestedTabsContent>
        <NestedTabsContent value="legal">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 items-center">
            <InputField
              label="Case No."
              value={deal.legal.case_no}
              onChange={(e) => setDealValue('legal.case_no', e.target.value)}
            />
            <InputField
              label="Auction Date"
              type="date"
              value={deal.timeline.auction_date}
              onChange={(e) => setDealValue('timeline.auction_date', e.target.value)}
            />
            <InputField
              label="Manual Days to Money"
              placeholder="Overrides auto-calc"
              type="number"
              suffix="days"
              min={0}
              value={deal.policy.manual_days_to_money ?? ''}
              onChange={(e) =>
                setDealValue(
                  'policy.manual_days_to_money',
                  e.target.value === '' ? null : e.target.value
                )
              }
            />
            <InputField
              label="Planned Close"
              type="number"
              suffix="days"
              value={deal.policy.planned_close_days || ''}
              onChange={(e) => setDealValue('policy.planned_close_days', e.target.value)}
            />
            <div className="pt-4">
              <ToggleSwitch
                label="Foreclosure Sale (Cert. of Title)"
                checked={deal.property.is_foreclosure_sale}
                onChange={() =>
                  setDealValue('property.is_foreclosure_sale', !deal.property.is_foreclosure_sale)
                }
              />
            </div>
            <div className="pt-4">
              <ToggleSwitch
                label="10-Day Redemption Period"
                checked={deal.property.is_redemption_period_sale}
                onChange={() =>
                  setDealValue(
                    'property.is_redemption_period_sale',
                    !deal.property.is_redemption_period_sale
                  )
                }
              />
            </div>
          </div>
        </NestedTabsContent>
        <NestedTabsContent value="scenarios">
          <ScenarioModeler deal={deal} />
        </NestedTabsContent>
        <NestedTabsContent value="double_close">
          {(() => {
            const setDC = (k: string, v: any) => setDealValue(`costs.double_close.${k}`, v);
            const dc = deal.costs.double_close || {};
            const dcCalcs = DoubleClose.computeDoubleClose(dc, { deal: { ...deal } });
            const doAutofill = () => {
              const filled = DoubleClose.autofill(dc, { deal: { ...deal } }, calc);
              setDealValue('costs.double_close', filled);
            };
            const isSimple = !!dc.use_simple_mode;

            return (
              <div className="space-y-4 mt-3">
                <GlassCard>
                  <div className="flex items-center justify-between">
                    <div className="label-xs uppercase">Double Close Tools</div>
                    <div className="flex items-center gap-3">
                      <ToggleSwitch
                        label={isSimple ? 'Simple' : 'Advanced'}
                        checked={isSimple}
                        onChange={() => setDC('use_simple_mode', !isSimple)}
                      />
                      <Button size="sm" onClick={doAutofill}>
                        Autofill from deal
                      </Button>
                    </div>
                  </div>
                </GlassCard>

                {isSimple && (
                  <GlassCard>
                    <h4 className="label-xs uppercase mb-2">Simple Mode — Core Inputs</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <SelectField
                        label="County"
                        value={dc.county || 'Orange'}
                        onChange={(e) => setDC('county', e.target.value)}
                      >
                        <option>Orange</option>
                        <option>Osceola</option>
                        <option>Polk</option>
                        <option>Miami-Dade</option>
                      </SelectField>
                      <InputField
                        label="A→B Price (Pab)"
                        type="number"
                        prefix="$"
                        value={isFinite(dc.pab) ? dc.pab : ''}
                        onChange={(e) => setDC('pab', e.target.value)}
                        placeholder="Enter Price"
                      />
                      <InputField
                        label="B→C Price (Pbc)"
                        type="number"
                        prefix="$"
                        value={isFinite(dc.pbc) ? dc.pbc : ''}
                        onChange={(e) => setDC('pbc', e.target.value)}
                        placeholder="Enter Price"
                      />
                      <SelectField
                        label="Structure"
                        value={dc.type || 'Same-day'}
                        onChange={(e) => setDC('type', e.target.value)}
                      >
                        <option>Same-day</option>
                        <option>Held-days</option>
                      </SelectField>
                      <InputField
                        label="Days Held"
                        type="number"
                        value={dc.type === 'Same-day' ? 0 : dc.days_held || ''}
                        onChange={(e) => setDC('days_held', e.target.value)}
                        disabled={dc.type === 'Same-day'}
                      />
                      <ToggleSwitch
                        label="Using Transactional Funding?"
                        checked={!!dc.using_tf}
                        onChange={() => setDC('using_tf', !dc.using_tf)}
                      />
                      {dc.using_tf && (
                        <>
                          <InputField
                            label="TF Principal"
                            type="number"
                            prefix="$"
                            value={isFinite(dc.tf_principal) ? dc.tf_principal : ''}
                            onChange={(e) => setDC('tf_principal', e.target.value)}
                            placeholder="Enter Amount"
                          />
                          <InputField
                            label="TF Points (e.g., 0.02)"
                            value={dc.tf_points_rate || ''}
                            onChange={(e) => setDC('tf_points_rate', e.target.value)}
                          />
                        </>
                      )}
                      <SelectField
                        label="HOA/Condo Present?"
                        value={dc.association_present || 'No'}
                        onChange={(e) => setDC('association_present', e.target.value)}
                      >
                        <option>No</option>
                        <option>Yes–HOA</option>
                        <option>Yes–Condo</option>
                      </SelectField>
                      {dc.association_present !== 'No' && (
                        <SelectField
                          label="Rush Estoppel?"
                          value={dc.rush_estoppel || 'No'}
                          onChange={(e) => setDC('rush_estoppel', e.target.value)}
                        >
                          <option>No</option>
                          <option>Yes</option>
                        </SelectField>
                      )}
                    </div>
                  </GlassCard>
                )}

                {!isSimple && (
                  <>
                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">A) Property & County</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <SelectField
                          label="County"
                          value={dc.county || 'Orange'}
                          onChange={(e) => setDC('county', e.target.value)}
                        >
                          <option>Orange</option>
                          <option>Osceola</option>
                          <option>Polk</option>
                        </SelectField>
                        <SelectField
                          label="Property Type"
                          value={dc.property_type || 'SFR'}
                          onChange={(e) => setDC('property_type', e.target.value)}
                        >
                          <option>SFR</option>
                          <option>Townhome</option>
                          <option>Condo</option>
                          <option>Duplex/2–4</option>
                          <option>Mobile on land</option>
                          <option>Vacant land</option>
                        </SelectField>
                        <SelectField
                          label="HOA/Condo Present"
                          value={dc.association_present || 'No'}
                          onChange={(e) => setDC('association_present', e.target.value)}
                        >
                          <option>No</option>
                          <option>Yes–HOA</option>
                          <option>Yes–Condo</option>
                        </SelectField>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">B) Structure & Timing</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <SelectField
                          label="Double-close type"
                          value={dc.type || 'Same-day'}
                          onChange={(e) => setDC('type', e.target.value)}
                        >
                          <option>Same-day</option>
                          <option>Held-days</option>
                        </SelectField>
                        <InputField
                          label="Days held (A–B → B–C)"
                          type="number"
                          value={dc.days_held || ''}
                          onChange={(e) => setDC('days_held', e.target.value)}
                        />
                        <SelectField
                          label="Same-day order (if applicable)"
                          value={dc.same_day_order || 'No preference'}
                          onChange={(e) => setDC('same_day_order', e.target.value)}
                        >
                          <option>No preference</option>
                          <option>A–B AM / B–C PM</option>
                        </SelectField>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">C) A–B (you BUY from seller)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <InputField
                          label="Pab"
                          type="number"
                          prefix="$"
                          value={isFinite(dc.pab) ? dc.pab : ''}
                          onChange={(e) => setDC('pab', e.target.value)}
                          placeholder="Enter Price"
                        />
                        <InputField
                          label="Title/settlement A–B"
                          type="number"
                          prefix="$"
                          value={dc.title_ab || ''}
                          onChange={(e) => setDC('title_ab', e.target.value)}
                        />
                        <InputField
                          label="Other fees A–B"
                          type="number"
                          prefix="$"
                          value={dc.other_ab || ''}
                          onChange={(e) => setDC('other_ab', e.target.value)}
                        />
                        <SelectField
                          label="Owner’s title policy paid by (A–B)"
                          value={dc.owners_title_payer_ab || 'Unknown'}
                          onChange={(e) => setDC('owners_title_payer_ab', e.target.value)}
                        >
                          <option>Seller</option>
                          <option>You</option>
                          <option>Unknown</option>
                        </SelectField>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">D) B–C (you SELL to end-buyer)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <InputField
                          label="Pbc"
                          type="number"
                          prefix="$"
                          value={isFinite(dc.pbc) ? dc.pbc : ''}
                          onChange={(e) => setDC('pbc', e.target.value)}
                          placeholder="Enter Price"
                        />
                        <InputField
                          label="Title/settlement B–C"
                          type="number"
                          prefix="$"
                          value={dc.title_bc || ''}
                          onChange={(e) => setDC('title_bc', e.target.value)}
                        />
                        <InputField
                          label="Other fees B–C"
                          type="number"
                          prefix="$"
                          value={dc.other_bc || ''}
                          onChange={(e) => setDC('other_bc', e.target.value)}
                        />
                        <SelectField
                          label="Owner’s title policy paid by (B–C)"
                          value={dc.owners_title_payer_bc || 'Unknown'}
                          onChange={(e) => setDC('owners_title_payer_bc', e.target.value)}
                        >
                          <option>You</option>
                          <option>End buyer</option>
                          <option>Unknown</option>
                        </SelectField>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">E) End-buyer funds</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <SelectField
                          label="Buyer funds"
                          value={dc.buyer_funds || 'Cash'}
                          onChange={(e) => setDC('buyer_funds', e.target.value)}
                        >
                          <option>Cash</option>
                          <option>Conventional</option>
                          <option>DSCR/Investor</option>
                          <option>Hard money</option>
                          <option>FHA</option>
                          <option>VA</option>
                        </SelectField>
                        <SelectField
                          label="Lender known"
                          value={dc.lender_known || 'N/A'}
                          onChange={(e) => setDC('lender_known', e.target.value)}
                        >
                          <option>N/A</option>
                          <option>Yes</option>
                          <option>No</option>
                        </SelectField>
                        <InputField
                          label="ARV (for fee check)"
                          type="number"
                          prefix="$"
                          value={dc.arv_for_fee_check || deal.market.arv || ''}
                          onChange={(e) => setDC('arv_for_fee_check', e.target.value)}
                        />
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">F) Transactional Funding (A–B)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                        <ToggleSwitch
                          label="Using Transactional Funding?"
                          checked={!!dc.using_tf}
                          onChange={() => setDC('using_tf', !dc.using_tf)}
                        />
                        <InputField
                          label="TF principal"
                          type="number"
                          prefix="$"
                          value={isFinite(dc.tf_principal) ? dc.tf_principal : ''}
                          onChange={(e) => setDC('tf_principal', e.target.value)}
                          placeholder="Enter Amount"
                        />
                        <InputField
                          label="TF points rate"
                          type="number"
                          placeholder="e.g., 0.02"
                          value={dc.tf_points_rate || ''}
                          onChange={(e) => setDC('tf_points_rate', e.target.value)}
                        />
                        <SelectField
                          label="Note executed in FL?"
                          value={dc.tf_note_executed_fl || 'No'}
                          onChange={(e) => setDC('tf_note_executed_fl', e.target.value)}
                        >
                          <option>No</option>
                          <option>Yes</option>
                          <option>Unsure</option>
                        </SelectField>
                        <SelectField
                          label="Note secured by property?"
                          value={dc.tf_secured || 'No'}
                          onChange={(e) => setDC('tf_secured', e.target.value)}
                        >
                          <option>No</option>
                          <option>Yes</option>
                          <option>Unsure</option>
                        </SelectField>
                        <InputField
                          label="TF extra fees"
                          type="number"
                          prefix="$"
                          value={dc.tf_extra_fees || ''}
                          onChange={(e) => setDC('tf_extra_fees', e.target.value)}
                        />
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">G) HOA / Condo (if applicable)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <SelectField
                          label="Association type"
                          value={dc.association_type || 'HOA'}
                          onChange={(e) => setDC('association_type', e.target.value)}
                        >
                          <option>HOA</option>
                          <option>Condo</option>
                          <option>N/A</option>
                        </SelectField>
                        <InputField
                          label="Estoppel fee"
                          type="number"
                          prefix="$"
                          value={dc.estoppel_fee || ''}
                          onChange={(e) => setDC('estoppel_fee', e.target.value)}
                        />
                        <SelectField
                          label="Rush estoppel ordered"
                          value={dc.rush_estoppel || 'No'}
                          onChange={(e) => setDC('rush_estoppel', e.target.value)}
                        >
                          <option>No</option>
                          <option>Yes</option>
                        </SelectField>
                        <InputField
                          label="Transfer/application fees"
                          type="number"
                          prefix="$"
                          value={dc.transfer_fees || ''}
                          onChange={(e) => setDC('transfer_fees', e.target.value)}
                        />
                        <SelectField
                          label="Board approval pre-closing"
                          value={dc.board_approval || 'No'}
                          onChange={(e) => setDC('board_approval', e.target.value)}
                        >
                          <option>No</option>
                          <option>Yes</option>
                          <option>Unsure</option>
                        </SelectField>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">H) Carry (if not same-day)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <InputField
                          label="Carry / holding cost"
                          type="number"
                          prefix="$"
                          value={dc.carry_amount || ''}
                          onChange={(e) => setDC('carry_amount', e.target.value)}
                        />
                        <SelectField
                          label="Carry basis"
                          value={dc.carry_basis || 'day'}
                          onChange={(e) => setDC('carry_basis', e.target.value)}
                        >
                          <option>day</option>
                          <option>month</option>
                        </SelectField>
                        <InputField
                          label="Days held (again)"
                          type="number"
                          value={dc.days_held || ''}
                          onChange={(e) => setDC('days_held', e.target.value)}
                        />
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">I) Targets & Estimation</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <InputField
                          label="Minimum acceptable net spread (optional)"
                          type="number"
                          prefix="$"
                          value={dc.min_net_spread || ''}
                          onChange={(e) => setDC('min_net_spread', e.target.value)}
                        />
                        <SelectField
                          label="Estimate with FL promulgated rates if missing?"
                          value={dc.use_promulgated_estimates || 'No'}
                          onChange={(e) => setDC('use_promulgated_estimates', e.target.value)}
                        >
                          <option>No</option>
                          <option>Yes</option>
                        </SelectField>
                        <SelectField
                          label="Assume owner’s title payer A–B"
                          value={dc.assumed_owner_payer_ab || 'Unknown'}
                          onChange={(e) => setDC('assumed_owner_payer_ab', e.target.value)}
                        >
                          <option>Unknown</option>
                          <option>Seller</option>
                          <option>You</option>
                        </SelectField>
                        <SelectField
                          label="Assume owner’s title payer B–C"
                          value={dc.assumed_owner_payer_bc || 'Unknown'}
                          onChange={(e) => setDC('assumed_owner_payer_bc', e.target.value)}
                        >
                          <option>Unknown</option>
                          <option>You</option>
                          <option>End buyer</option>
                        </SelectField>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h4 className="label-xs uppercase mb-2">J) Outputs & Apply</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                        <div className="flex items-center justify-between">
                          <ToggleSwitch
                            label="Show items 1–13 full math"
                            checked={dc.show_items_math === undefined ? true : !!dc.show_items_math}
                            onChange={() => setDC('show_items_math', !dc.show_items_math)}
                          />
                          <ToggleSwitch
                            label="Show fee target check"
                            checked={dc.show_fee_target === undefined ? true : !!dc.show_fee_target}
                            onChange={() => setDC('show_fee_target', !dc.show_fee_target)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <ToggleSwitch
                            label="Show FHA/VA 90-day flag"
                            checked={dc.show_90d_flag === undefined ? true : !!dc.show_90d_flag}
                            onChange={() => setDC('show_90d_flag', !dc.show_90d_flag)}
                          />
                          <ToggleSwitch
                            label="Show notes/assumptions"
                            checked={dc.show_notes === undefined ? true : !!dc.show_notes}
                            onChange={() => setDC('show_notes', !dc.show_notes)}
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </>
                )}

                <GlassCard>
                  <h3 className="text-white font-semibold text-base mb-2">Double-Close Results</h3>

                  {(dc.show_items_math === undefined || dc.show_items_math) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="info-card space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span>Deed Stamps (A–B)</span>
                          <span className="font-semibold">{fmt$(dcCalcs.Deed_Stamps_AB)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Deed Stamps (B–C)</span>
                          <span className="font-semibold">{fmt$(dcCalcs.Deed_Stamps_BC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Title/Settlement A–B</span>
                          <span className="font-semibold">{fmt$(dcCalcs.Title_AB)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Title/Settlement B–C</span>
                          <span className="font-semibold">{fmt$(dcCalcs.Title_BC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other A–B</span>
                          <span className="font-semibold">{fmt$(dcCalcs.Other_AB)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other B–C</span>
                          <span className="font-semibold">{fmt$(dcCalcs.Other_BC)}</span>
                        </div>
                      </div>
                      <div className="info-card space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span>TF Points ($)</span>
                          <span className="font-semibold">{fmt$(dcCalcs.TF_Points_$)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Doc Stamps on Note</span>
                          <span className="font-semibold">{fmt$(dcCalcs.DocStamps_Note)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Intangible Tax</span>
                          <span className="font-semibold">{fmt$(dcCalcs.Intangible_Tax)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carry (daily)</span>
                          <span className="font-semibold">{fmt$(dcCalcs.Carry_Daily)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carry (total)</span>
                          <span className="font-semibold">{fmt$(dcCalcs.Carry_Total)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-white/10 my-3" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="highlight-card flex items-center justify-between">
                      <span className="font-semibold text-cyan-200">Extra Closing Load</span>
                      <span className="text-lg font-extrabold">
                        {fmt$(dcCalcs.Extra_Closing_Load)}
                      </span>
                    </div>
                    <div className="info-card space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span>Gross Spread (Pbc − Pab)</span>
                        <span className="font-semibold">{fmt$(dcCalcs.Gross_Spread)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Spread (before carry)</span>
                        <span className="font-semibold">
                          {fmt$(dcCalcs.Net_Spread_Before_Carry)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Spread (after carry)</span>
                        <span className="font-semibold">
                          {fmt$(dcCalcs.Net_Spread_After_Carry)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {(dc.show_fee_target === undefined || dc.show_fee_target) && (
                      <div className="info-card text-sm flex items-center justify-between">
                        <div>
                          <div className="label-xs">Fee Target (≥ 3% of ARV)</div>
                          <div>
                            Threshold:{' '}
                            <span className="font-semibold">
                              {fmt$(dcCalcs.Fee_Target_Threshold)}
                            </span>
                          </div>
                        </div>
                        <Badge
                          color={
                            dcCalcs.Fee_Target_Check === 'YES'
                              ? 'green'
                              : dcCalcs.Fee_Target_Check === 'NO'
                                ? 'orange'
                                : 'blue'
                          }
                        >
                          {dcCalcs.Fee_Target_Check}
                        </Badge>
                      </div>
                    )}
                    {(dc.show_90d_flag === undefined || dc.show_90d_flag) && (
                      <div className="info-card text-sm flex items-center justify-between">
                        <div className="label-xs">FHA/VA 90-Day Seasoning</div>
                        <Badge
                          color={
                            String(dcCalcs.Seasoning_Flag).startsWith('HIGH') ? 'orange' : 'green'
                          }
                        >
                          {dcCalcs.Seasoning_Flag}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {(dc.show_notes === undefined || dc.show_notes) && (
                    <div className="mt-3 info-card text-xs text-cyan-300/80">
                      <div className="label-xs mb-1">Notes / Assumptions</div>
                      <ul className="list-disc pl-5 space-y-1">
                        {dcCalcs.notes.map((n: string, i: number) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </GlassCard>
              </div>
            );
          })()}
        </NestedTabsContent>
      </NestedTabs>
    </GlassCard>
  );
};

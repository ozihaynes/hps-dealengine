import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

import type {
  Deal,
  DealWrapper,
  EstimatorState,
  AppSettings,
  ProfileSettings,
  BusinessSettings,
  TeamMember,
  DealPreset,
  SandboxSettings,
  SandboxPreset,
} from './types';
import { num, fmt$ } from './utils/helpers';
import { Icons, createInitialEstimatorState } from './constants';
import { createInitialSandboxState } from './constants/sandboxSettings';
import { HPSEngine } from './services/engine';

import {
  Badge,
  Button,
  GlassCard,
  Icon,
  InputField,
  SelectField,
  ToggleSwitch,
  Modal,
} from './components/ui';
import ComplianceAlerts from './components/shared/ComplianceAlerts';
import OverviewTab from './components/overview/OverviewTab';
import RepairsTab from './components/repairs/RepairsTab';
import UnderwriteTab from './components/underwrite/UnderwriteTab';
import BusinessLogicSandbox from './components/settings/BusinessLogicSandbox';
import MobileBottomNav from './components/shared/MobileBottomNav';

const GlobalStyles = () => (
  <style>{`
    [data-theme="dark"] {
      --brand-navy: #000F22;
      --brand-blue: #0096FF;

      /* Text */
      --text-primary: #F2F6FF;
      --text-secondary: #9FB3C8;

      /* Glass surfaces */
      --surface-1: rgba(0, 15, 34, 0.55);
      --surface-2: rgba(0, 150, 255, 0.08);

      /* Lines & glow */
      --line: rgba(0, 150, 255, 0.18);
      --ring: rgba(0, 150, 255, 0.45);

      /* Radii/blur/shadows */
      --r-card: 24px;
      --blur: 18px;
      --shadow-soft: 0 6px 24px -6px rgba(0, 150, 255, 0.20);

      /* Background */
      --bg: #000B18;

      /* Legacy/App Specific */
      --bg-main: var(--bg);
      --accent-blue: var(--brand-blue);
      --accent-green: #00BF63;
      --accent-orange: #FF4500;
      --accent-red: #990000;
      --text-brand-red-light: #f8b4b4;
      --text-accent-orange-light: #ff9b71;
      --card-profit-bg: #00142c;
      --card-profit-border: #00386b;
      --card-profit-flip-bg: #003d7a;
      --repair-scope-text: var(--text-primary);
      --repair-scope-bg: #001831;
      --repair-scope-border: #00386b;
    }
    [data-theme="original"] {
      /* Brand */
      --brand-navy: #0B1A2B;
      --brand-blue: #007FE0;

      /* Text */
      --text-primary: #0F1A26;
      --text-secondary: #39516A;

      /* Glass surfaces */
      --surface-1: rgba(255,255,255,0.85);
      --surface-2: rgba(0,127,224,0.06);

      /* Lines & glow */
      --line: rgba(0,127,224,0.22);
      --ring: rgba(0,127,224,0.45);

      /* Radii/blur/shadows */
      --r-card: 24px;
      --blur: 18px;
      --shadow-soft: 0 6px 24px -6px rgba(0, 30, 70, 0.10);

      /* Background */
      --bg: #EEF4FF;

      /* Legacy/App Specific */
      --bg-main: var(--bg);
      --accent-blue: var(--brand-blue);
      --accent-green: #38A169;
      --accent-orange: #DD6B20;
      --accent-red: #C53030;
      --text-brand-red-light: color-mix(in srgb, var(--accent-red) 80%, var(--bg-main));
      --text-accent-orange-light: color-mix(in srgb, var(--accent-orange) 80%, var(--bg-main));
      --card-profit-bg: #EDF2F7;
      --card-profit-border: #E2E8F0;
      --card-profit-flip-bg: #E2E8F0;
      --repair-scope-text: var(--text-primary);
      --repair-scope-bg: #FFFFFF;
      --repair-scope-border: #CBD5E0;
    }
    :root {
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      --font-mono: 'Roboto Mono', monospace;
    }
    body {
      background-color: var(--bg-main);
      color: var(--text-primary);
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    @keyframes pulse { 50% { opacity: .5; } }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .metric-glow { text-shadow: 0 0 8px rgba(0, 150, 255, 0.3), 0 0 12px rgba(0, 150, 255, 0.2); }
    [data-theme="original"] .metric-glow { text-shadow: none; }
    .card-icy {
      border-radius: var(--r-card);
      background:
        linear-gradient(180deg, var(--surface-1), rgba(0, 15, 34, 0.35)),
        linear-gradient(180deg, var(--surface-2), rgba(0, 150, 255, 0.02));
      border: 1px solid var(--line);
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(var(--blur)) saturate(140%);
      -webkit-backdrop-filter: blur(var(--blur)) saturate(140%);
      padding: 2rem;
      transition: background-color 0.2s ease;
    }
    .info-card {
      background: color-mix(in srgb, var(--accent-blue) 10%, transparent);
      border-radius: 8px;
      padding: 1rem;
    }
    .highlight-card {
        background: linear-gradient(90deg, color-mix(in srgb, var(--accent-blue) 20%, transparent) 0%, color-mix(in srgb, var(--accent-blue) 5%, transparent) 100%);
        border-radius: 8px;
        padding: 1rem;
    }
    .card-orange {
        background: linear-gradient(90deg, var(--accent-orange) 0%, color-mix(in srgb, var(--accent-orange) 80%, black) 100%);
        border-radius: 8px;
    }
    .muted { color: var(--text-secondary); opacity: 0.7; }
    .label-xs { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); letter-spacing: 0.05em; }
    .tab-trigger { 
      padding: 1rem;
      font-size: 1rem;
      font-weight: 600; 
      color: var(--text-secondary); 
      transition: all 0.2s ease; 
      border-bottom: 3px solid transparent;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tab-trigger:hover { 
      color: var(--text-primary); 
      background-color: transparent;
    }
    .tab-trigger.active { 
      color: var(--text-primary); 
      background-color: transparent;
      border-bottom-color: var(--accent-blue); 
      box-shadow: none;
    }
    .dark-input, .dark-select, textarea.dark-input {
      width: 100%;
      color: var(--text-primary);
      font-size: 1rem;
      background:
        linear-gradient(180deg, rgba(0, 15, 34, 0.60), rgba(0, 15, 34, 0.35)),
        linear-gradient(180deg, var(--surface-2), rgba(0, 150, 255, 0.02));
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 14px;
      outline: none;
      box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset;
      transition: box-shadow .15s ease, border-color .15s ease;
      backdrop-filter: blur(var(--blur)) saturate(130%);
      -webkit-backdrop-filter: blur(var(--blur)) saturate(130%);
    }

    [data-theme="original"] .dark-input,
    [data-theme="original"] .dark-select,
    [data-theme="original"] textarea.dark-input {
      background:
        linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.70)),
        linear-gradient(180deg, var(--surface-2), rgba(0,127,224,0.02));
      box-shadow: 0 1px 0 rgba(0,0,0,0.03) inset;
    }
    
    :where(.dark-input, .dark-select, textarea.dark-input):focus-visible {
      outline: none;
      border-color: var(--ring);
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 60%, transparent);
    }

    .dark-select option { background-color: var(--bg-main); color: var(--text-primary); }
    .text-brand-red { color: var(--accent-red); }
    .text-brand-red-light { color: var(--text-brand-red-light); }
    .bg-brand-red-subtle { background-color: color-mix(in srgb, var(--accent-red) 20%, transparent); }
    .border-brand-red-subtle { border-color: color-mix(in srgb, var(--accent-red) 30%, transparent); }
    .bg-brand-red-zone { background-color: color-mix(in srgb, var(--accent-red) 25%, transparent); }
    .text-accent-green { color: var(--accent-green); }
    .text-accent-orange { color: var(--accent-orange); }
    .text-accent-orange-light { color: var(--text-accent-orange-light); }
    .bg-accent-orange-subtle { background-color: color-mix(in srgb, var(--accent-orange) 20%, transparent); }
    .border-accent-orange-subtle { border-color: color-mix(in srgb, var(--accent-orange) 30%, transparent); }
    .flip-card { background-color: transparent; min-height: 105px; perspective: 1000px; cursor: pointer; }
    .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-d; }
    .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
    .flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; -webkit-backface-visibility: hidden; backface-visibility: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
    .flip-card-back { transform: rotateY(180deg); }
    .profit-flip .card-icy { background: var(--card-profit-bg) !important; border: none !important; backdrop-filter: none !important; }
    .profit-flip .flip-card-front { background: var(--card-profit-bg) !important; }
    .profit-flip .flip-card-back { background: var(--card-profit-flip-bg) !important; }
    .profit-flip.flip-card { overflow: hidden; border-radius: 12px; }
    .repairs-scope, .repairs-scope *:not(svg):not(path) { color: var(--repair-scope-text); }
    .repairs-scope .muted, .repairs-scope .label-xs { color: var(--text-secondary); opacity: 0.8; }
    .repairs-scope table, .repairs-scope thead, .repairs-scope tbody, .repairs-scope th, .repairs-scope td { color: inherit; }
    .repairs-scope .card-icy, .repairs-scope .info-card, .repairs-scope .highlight-card { color: var(--repair-scope-text); }
    .repairs-scope .dark-input, .repairs-scope .dark-select { color: var(--repair-scope-text); background-color: var(--repair-scope-bg); border: 1px solid var(--line); }
    .repairs-scope .dark-input::placeholder { color: color-mix(in srgb, var(--text-secondary) 80%, transparent); }
    .repairs-scope .dark-select option { background-color: var(--bg-main); color: var(--text-primary); }
    .repairs-scope input:-webkit-autofill, .repairs-scope textarea:-webkit-autofill, .repairs-scope select:-webkit-autofill { -webkit-text-fill-color: var(--repair-scope-text); -webkit-box-shadow: 0 0 0px 1000px var(--repair-scope-bg) inset; box-shadow: 0 0 0px 1000px var(--repair-scope-bg) inset; }
    /* Hide number input arrows */
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
    .dark-input.prefixed {
      padding-left: 1.75rem;
    }
    .prose { color: var(--text-secondary); }
    .prose strong { color: var(--text-primary); }
    .prose h1, .prose h2, .prose h3, .prose h4 { color: var(--text-primary); }
    .prose ul { list-style-type: disc; padding-left: 1.5rem; }
    .prose li { margin-bottom: 0.5rem; }
  `}</style>
);

const UserTeamSettings = ({ settings, updateSettings, showToast }: any) => {
  const [editedProfile, setEditedProfile] = useState<ProfileSettings>(settings.profile);
  const [editedBusiness, setEditedBusiness] = useState<BusinessSettings>(settings.business);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('Viewer');
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const profileHasChanges = useMemo(
    () => JSON.stringify(editedProfile) !== JSON.stringify(settings.profile),
    [editedProfile, settings.profile]
  );
  const businessHasChanges = useMemo(
    () => JSON.stringify(editedBusiness) !== JSON.stringify(settings.business),
    [editedBusiness, settings.business]
  );

  const handleSave = (key: keyof AppSettings, value: any) => {
    updateSettings((prev: AppSettings) => ({ ...prev, [key]: value }));
    showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} settings saved!`);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedBusiness((prev) => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInvite = () => {
    if (!inviteEmail) {
      showToast('Please enter an email address.', 'orange');
      return;
    }
    const newMember: TeamMember = {
      id: Date.now(),
      name: 'New User',
      email: inviteEmail,
      role: inviteRole,
    };
    updateSettings((prev: AppSettings) => ({ ...prev, team: [...prev.team, newMember] }));
    setInviteEmail('');
    setInviteRole('Viewer');
    showToast('Invite sent successfully!');
  };

  const handleRemoveMember = (member: TeamMember) => {
    updateSettings((prev: AppSettings) => ({
      ...prev,
      team: prev.team.filter((m) => m.id !== member.id),
    }));
    setMemberToRemove(null);
    showToast('Team member removed.', 'orange');
  };

  return (
    <div className="space-y-6">
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Confirm Removal"
      >
        {memberToRemove && (
          <div>
            <p className="text-text-secondary mb-4">
              Are you sure you want to remove{' '}
              <strong className="text-text-primary">{memberToRemove.name}</strong> from the team?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="neutral" onClick={() => setMemberToRemove(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleRemoveMember(memberToRemove)}>
                Yes, Remove
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <GlassCard className="p-6">
        <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Icon d={Icons.edit} size={18} /> Theme Settings
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">Select Theme:</span>
          <Button
            variant={settings.theme === 'dark' ? 'primary' : 'neutral'}
            onClick={() => updateSettings((p: AppSettings) => ({ ...p, theme: 'dark' }))}
          >
            Dark (Default)
          </Button>
          <Button
            variant={settings.theme === 'original' ? 'primary' : 'neutral'}
            onClick={() => updateSettings((p: AppSettings) => ({ ...p, theme: 'original' }))}
          >
            Original (Light)
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Icon d={Icons.user} size={18} /> Profile Settings
          </h3>
          <Button
            size="sm"
            onClick={() => handleSave('profile', editedProfile)}
            disabled={!profileHasChanges}
          >
            Save Profile
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Your Name"
            value={editedProfile.name}
            onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
          />
          <InputField
            label="Email Address"
            type="email"
            value={editedProfile.email}
            onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
          />
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Icon d={Icons.briefcase} size={18} /> Business Settings
          </h3>
          <Button
            size="sm"
            onClick={() => handleSave('business', editedBusiness)}
            disabled={!businessHasChanges}
          >
            Save Business
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <InputField
            label="Business Name"
            value={editedBusiness.name}
            onChange={(e) => setEditedBusiness({ ...editedBusiness, name: e.target.value })}
          />
          <div className="flex items-center gap-4">
            <div className="flex-grow">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Business Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="dark-input file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent-blue/20 file:text-accent-blue hover:file:bg-accent-blue/30 w-full"
              />
            </div>
            {editedBusiness.logo && (
              <img
                src={editedBusiness.logo}
                alt="Logo Preview"
                className="w-12 h-12 rounded-full object-cover bg-white/10"
              />
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Icon d={Icons.users} size={18} /> Team Access
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4">
          <InputField
            label="Invite by Email"
            type="email"
            placeholder="name@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <SelectField
            label="Set Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
          >
            <option value="Viewer">Viewer (Read-only)</option>
            <option value="Underwriter">Underwriter (Can edit deals)</option>
            <option value="Admin">Admin (Can manage team)</option>
          </SelectField>
          <div className="pt-6">
            <Button onClick={handleInvite} className="w-full">
              Send Invite
            </Button>
          </div>
        </div>
        <h4 className="font-semibold text-text-secondary mb-3">Current Team</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="label-xs text-text-secondary">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings.team.map((member: TeamMember) => (
                <tr key={member.id}>
                  <td className="p-2 font-semibold text-text-primary">{member.name}</td>
                  <td className="p-2 text-text-secondary">{member.email}</td>
                  <td className="p-2">
                    <Badge>{member.role}</Badge>
                  </td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="danger" onClick={() => setMemberToRemove(member)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

const SettingsPage = ({ settings, updateSettings, setCurrentPage, showToast }: any) => {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">User, Business & Team Settings</h2>
        <Button onClick={() => setCurrentPage('engine')} variant="ghost">
          &larr; Back to Engine
        </Button>
      </div>
      <UserTeamSettings settings={settings} updateSettings={updateSettings} showToast={showToast} />
    </GlassCard>
  );
};

function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      }
    } catch (error) {
      console.error(error);
    }
    return initialValue;
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

const initialSettings: AppSettings = {
  theme: 'dark',
  profile: { name: 'Jane Doe', email: 'jane.doe@example.com' },
  business: {
    name: 'HPS Investments LLC',
    logo: 'https://www.haynespropertysolutions.com/wp-content/uploads/sites/4064/2025/09/cropped-Gemini_Generated_Image_dlof39dlof39dlof-Edited-Edited.png',
  },
  team: [
    { id: 1, name: 'John Smith', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Alice Brown', email: 'alice@example.com', role: 'Underwriter' },
  ],
  sandboxLogic: `/* VISUAL-ONLY SANDBOX
  Logic entered here is saved in local storage
  but does not currently affect the engine calculations.
  
  Use the AI tools to generate or explain logic.
*/`,
  dealPresets: [],
  sandbox: createInitialSandboxState(),
  sandboxPresets: [],
};

const createInitialDeal = (): Deal => ({
  market: {
    arv: '',
    as_is_value: '',
    dom_zip: 90,
    moi_zip: 3.5,
    'price-to-list-pct': 0.98,
    local_discount_20th_pct: 0.18,
    zip_discount_20pct: 0.15,
  },
  costs: {
    repairs_base: 0,
    contingency_pct: 15,
    monthly: { taxes: 0, insurance: 0, hoa: 0, utilities: 0, interest: 0 },
    sell_close_pct: 0.015,
    concessions_pct: 0.02,
    list_commission_pct: null,
    double_close: {},
  },
  debt: {
    senior_principal: '',
    senior_per_diem: '',
    good_thru_date: '',
    juniors: [],
    hoa_arrears: 0,
    muni_fines: 0,
    payoff_is_confirmed: false,
    protective_advances: 0,
    hoa_estoppel_fee: 0,
    pending_special_assessment: 0,
  },
  timeline: { days_to_sale_manual: 90, days_to_ready_list: 30, auction_date: '' },
  property: {
    occupancy: 'owner',
    year_built: 2000,
    seller_is_foreign_person: false,
    stories: 1,
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
  confidence: { score: 'C', notes: '', no_access_flag: false, reinstatement_proof_flag: false },
  title: { cure_cost: 0, risk_pct: 0 },
  policy: {
    safety_on_aiv_pct: 0.03,
    min_spread: 25000,
    planned_close_days: 14,
    costs_are_annual: false,
    manual_days_to_money: null,
    assignment_fee_target: 15000,
  },
  legal: { case_no: '', auction_date: '' },
  cma: {
    subject: { sqft: 1500, beds: 3, baths: 2, garage: 2, pool: 0 },
    adjKey: {
      perSqft: 150,
      perBed: 5000,
      perBath: 7500,
      perGarage: 10000,
      perCond: -10000,
      perPool: 20000,
      perMonth: -100,
    },
    comps: [],
  },
});

const TABS = [
  { id: 'overview', label: 'Overview', icon: Icons.barChart },
  { id: 'repairs', label: 'Repairs', icon: Icons.wrench },
  { id: 'underwrite', label: 'Underwrite', icon: Icons.calculator },
];

const MOBILE_NAV_ITEMS = [
  ...TABS,
  { id: 'settings', label: 'Settings', icon: Icons.settings },
];

const App = () => {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    'hps-dealengine-settings',
    initialSettings
  );
  const [deal, setDeal] = useLocalStorage<Deal>('hps-dealengine-deal', createInitialDeal());
  const [estimatorState, setEstimatorState] = useLocalStorage<EstimatorState>(
    'hps-dealengine-estimator',
    createInitialEstimatorState()
  );

  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState('engine'); // 'engine', 'settings', 'sandbox'
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; color: string; visible: boolean }>({
    message: '',
    color: 'green',
    visible: false,
  });

  // AI Analysis State
  const [playbookContent, setPlaybookContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisRun, setAnalysisRun] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const showToast = (message: string, color = 'green') => {
    setToast({ message, color, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  const dealWrapper = useMemo(() => ({ deal }), [deal]);
  const { calculations, flags, missingInfo, state } = HPSEngine.useDealEngine(
    dealWrapper,
    settings.sandbox
  );

  const hasUserInput = useMemo(
    () =>
      String(deal.market.arv).trim() !== '' ||
      String(deal.market.as_is_value).trim() !== '' ||
      String(deal.debt.senior_principal).trim() !== '',
    [deal.market.arv, deal.market.as_is_value, deal.debt.senior_principal]
  );

  const runAIAnalysis = async () => {
    if (!hasUserInput) {
      showToast(
        'Please enter core deal data (ARV, As-Is Value, Principal) before analyzing.',
        'orange'
      );
      return;
    }
    setIsAnalyzing(true);
    setPlaybookContent('');
    setAnalysisRun(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const systemInstruction = `You are an expert real estate sales consultant and negotiation strategist. Your goal is to create a compelling sales script and key negotiation points to help sell a wholesale real estate deal to an investor. Your tone should be professional, confident, and data-driven. Format your response using Markdown.`;

      const prompt = `Analyze the provided deal data. Using this data AND your access to Google Search for current market context, generate a 'Negotiation Playbook'. The playbook should be well-structured and include:
1.  **The Elevator Pitch:** A concise, powerful summary of the deal's value proposition.
2.  **Key Selling Points:** 3-5 bullet points highlighting the strongest aspects of the deal (e.g., high ARV, great location, value-add potential, market trends).
3.  **Anticipated Objections & Rebuttals:** Potential investor concerns (e.g., repair costs, market softness) and how to address them confidently.
4.  **Closing Script:** A short script to create urgency and close the deal.
            
Here is the deal data:
\`\`\`json
${JSON.stringify({ deal, calculations }, null, 2)}
\`\`\``;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      let aiContent = response.text;
      aiContent = aiContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .split('\n')
        .map((line: string) => (line.trim().startsWith('* ') ? `<li>${line.substring(2)}</li>` : line))
        .join('\n')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/<\/ul>\n<ul>/g, '');

      setPlaybookContent(aiContent);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      setPlaybookContent(
        "<p class='text-accent-orange'>Error generating analysis. Please check your connection and try again.</p>"
      );
      showToast('An error occurred during AI analysis.', 'orange');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const setDealValue = useCallback(
    (path: string, value: any) => {
      setDeal((prev) => {
        const newDeal = JSON.parse(JSON.stringify(prev));
        let current: any = newDeal;
        const keys = path.split('.');
        for (let i = 0; i < keys.length - 1; i++) {
          if (current[keys[i]] === undefined) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newDeal;
      });
      // Reset analysis when deal data changes
      setAnalysisRun(false);
      setPlaybookContent('');
    },
    [setDeal]
  );

  const handleEstimatorCostChange = (
    sectionKey: string,
    itemKey: string,
    field: string,
    value: any
  ) => {
    setEstimatorState((prev) => {
      const newState = { ...prev };
      newState.costs[sectionKey][itemKey] = {
        ...newState.costs[sectionKey][itemKey],
        [field]: value,
      };
      return newState;
    });
    setAnalysisRun(false);
  };

  const handleEstimatorQuantityChange = (itemKey: string, value: number) => {
    setEstimatorState((prev) => ({
      ...prev,
      quantities: { ...prev.quantities, [itemKey]: value },
    }));
    setAnalysisRun(false);
  };

  const handleResetEstimator = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all detailed repair estimates? This cannot be undone.'
      )
    ) {
      setEstimatorState(createInitialEstimatorState());
      setAnalysisRun(false);
    }
  };

  const handleSaveSandbox = (newSandboxSettings: SandboxSettings, presetName?: string) => {
    setSettings((prev) => {
      const newSettings = { ...prev, sandbox: newSandboxSettings };
      if (presetName) {
        const newPreset: SandboxPreset = {
          id: Date.now(),
          name: presetName,
          settings: newSandboxSettings,
        };
        newSettings.sandboxPresets = [...prev.sandboxPresets, newPreset];
      }
      return newSettings;
    });
    setIsSandboxOpen(false);
    showToast(presetName ? `Preset "${presetName}" saved!` : 'Sandbox settings saved!');
    setAnalysisRun(false);
  };

  const handleLoadPreset = (loadedSettings: SandboxSettings) => {
    setSettings((prev) => ({ ...prev, sandbox: loadedSettings }));
    showToast('Preset loaded into current session.');
    setAnalysisRun(false);
  };

  const handleDeletePreset = (id: number) => {
    setSettings((prev) => ({
      ...prev,
      sandboxPresets: prev.sandboxPresets.filter((p) => p.id !== id),
    }));
    showToast('Preset deleted.', 'orange');
  };

  const handleMobileNavChange = (tabId: string) => {
    if (tabId === 'settings') {
      setCurrentPage('settings');
    } else {
      setCurrentPage('engine');
      setActiveTab(tabId);
    }
  };

  const activeMobileTab = currentPage === 'settings' ? 'settings' : activeTab;

  const enginePageContent = (
    <>
      <ComplianceAlerts flags={flags} missingInfo={missingInfo} />
      <div className="relative">
        {activeTab === 'overview' && (
          <OverviewTab
            deal={deal}
            calc={calculations}
            flags={flags}
            hasUserInput={hasUserInput}
            playbookContent={playbookContent}
            isAnalyzing={isAnalyzing}
            analysisRun={analysisRun}
          />
        )}
        {activeTab === 'repairs' && (
          <RepairsTab
            deal={deal}
            setDealValue={setDealValue}
            calc={calculations}
            estimatorState={estimatorState}
            onCostChange={handleEstimatorCostChange}
            onQuantityChange={handleEstimatorQuantityChange}
            onReset={handleResetEstimator}
          />
        )}
        {activeTab === 'underwrite' && (
          <UnderwriteTab
            deal={deal}
            calc={calculations}
            setDealValue={setDealValue}
            sandbox={settings.sandbox}
          />
        )}
      </div>
    </>
  );

  return (
    <div className="h-screen p-4">
      <GlobalStyles />
      {toast.visible && (
        <div
          className={`fixed bottom-5 right-5 px-4 py-2 rounded-md shadow-lg text-white ${toast.color === 'green' ? 'bg-accent-green' : 'bg-accent-orange'}`}
        >
          {toast.message}
        </div>
      )}
      <BusinessLogicSandbox
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        onSave={handleSaveSandbox}
        initialSettings={settings.sandbox}
        presets={settings.sandboxPresets}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={handleDeletePreset}
      />
      <div className="container mx-auto max-w-[1800px] rounded-2xl shadow-lg shadow-blue-900/20 h-full flex flex-col overflow-hidden">
        <header className="flex items-start justify-between p-6 md:p-8 flex-shrink-0">
          <div className="inline-block">
            <div className="flex items-center gap-4">
              {settings.business.logo ? (
                <img
                  src={settings.business.logo}
                  alt="Business Logo"
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <Icon d={Icons.calculator} size={40} className="text-accent-blue" />
              )}
              <h1 className="text-4xl font-bold text-text-primary">DealEngine&trade;</h1>
            </div>
            <div className="flex items-center gap-4 mt-4">
              {TABS.map((tabInfo) => (
                <button
                  key={tabInfo.id}
                  onClick={() => setActiveTab(tabInfo.id)}
                  className={`tab-trigger ${activeTab === tabInfo.id ? 'active' : ''}`}
                >
                  <Icon d={tabInfo.icon} size={16} />
                  <span>{tabInfo.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Button onClick={() => setIsSandboxOpen(true)} variant="ghost" className="p-2">
                  <Icon d={Icons.sliders} size={28} />
                  <span className="sr-only">Business Logic Sandbox</span>
                </Button>
                <div className="invisible group-hover:visible absolute top-full right-0 mt-2 w-max px-3 py-1.5 bg-gray-900/90 backdrop-blur-sm text-gray-100 text-xs rounded-md shadow-lg z-10 whitespace-nowrap">
                  Business Logic Sandbox
                  <div className="absolute bottom-full right-4 -mb-1 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900/90" />
                </div>
              </div>
              <div className="relative group">
                <Button onClick={() => setCurrentPage('settings')} variant="ghost" className="p-2">
                  <Icon d={Icons.user} size={28} />
                  <span className="sr-only">User/Team Settings</span>
                </Button>
                <div className="invisible group-hover:visible absolute top-full right-0 mt-2 w-max px-3 py-1.5 bg-gray-900/90 backdrop-blur-sm text-gray-100 text-xs rounded-md shadow-lg z-10 whitespace-nowrap">
                  User/Team Settings
                  <div className="absolute bottom-full right-4 -mb-1 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900/90" />
                </div>
              </div>
            </div>
            <Button
              onClick={runAIAnalysis}
              variant="primary"
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              <Icon d={Icons.playbook} size={16} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          </div>
        </header>
        <main className="flex-grow overflow-y-auto px-6 md:px-8 pb-6 md:pb-8">
          {currentPage === 'engine' ? (
            enginePageContent
          ) : (
            <SettingsPage
              settings={settings}
              updateSettings={setSettings}
              setCurrentPage={setCurrentPage}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Mobile bottom navigation (visible on mobile/tablet only) */}
      <MobileBottomNav
        navItems={MOBILE_NAV_ITEMS}
        activeTab={activeMobileTab}
        onTabChange={handleMobileNavChange}
      />
    </div>
  );
};

export default App;







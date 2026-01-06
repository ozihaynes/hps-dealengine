
import React from 'react';
import type { Flag, Flags } from '../../types';
import { Icon } from '../ui';
import { Icons } from '../../constants';

interface ComplianceAlertsProps {
  flags: Flags;
  missingInfo: string[];
  show?: boolean;
}

const ComplianceAlerts: React.FC<ComplianceAlertsProps> = ({ flags, missingInfo, show = true }) => {
  if (!show) return null;

  // FIX: Use a more specific filter to ensure correct type inference for `flag`.
  const activeFlags = Object.values(flags).filter((flag: Flag) => !!flag?.active);

  if (missingInfo.length === 0 && activeFlags.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {missingInfo.length > 0 && (
        <div className="p-3 rounded-lg bg-brand-red-subtle text-brand-red-light text-sm font-semibold flex items-center gap-2">
          <Icon d={Icons.alert} /> HOLD: Cannot generate a final offer. Missing critical info:{' '}
          {missingInfo.join(', ')}.
        </div>
      )}
      {activeFlags.map((flag, i) => (
        <div
          key={i}
          className="p-3 rounded-lg bg-accent-orange-subtle text-accent-orange-light text-sm font-semibold flex items-center gap-2"
        >
          <Icon d={Icons.alert} /> {flag.message}
        </div>
      ))}
    </div>
  );
};

export default ComplianceAlerts;





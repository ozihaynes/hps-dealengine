import SettingsPrefs from '@/components/SettingsPrefs';
import SettingsTokens from '@/components/SettingsTokens';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsPrefs />
      <SettingsTokens />
    </main>
  );
}

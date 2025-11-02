// @ts-nocheck
// Server wrapper that mounts the real client tab
import UnderwriteTab from '@/components/UnderwriteTab';

export default function UnderwritePage() {
  return (
    <main className="app-container" style={{ padding: 24 }}>
      <h2 className="title" style={{ marginBottom: 12 }}>
        Underwrite
      </h2>
      <UnderwriteTab />
    </main>
  );
}

import TokensEditor from '@/components/TokensEditor';

export const dynamic = 'force-dynamic';

export default function SourcesPage() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sources</h1>
      <TokensEditor />
    </main>
  );
}

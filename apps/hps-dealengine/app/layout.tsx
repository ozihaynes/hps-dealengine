import '@/components/gemini/globals.css';
import '../styles/tokens.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HPS DealEngine',
  description: 'Investor Underwriting Sandbox',
};

function NavItem({ href, label }: { href: string; label: string }) {
  const isActive = typeof window !== 'undefined' && window.location.pathname.startsWith(href);
  return (
    <a className={'tab' + (isActive ? ' active' : '')} href={href}>
      {label}
    </a>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <header className="shell-header">
          <div className="brand">HPS DealEngine</div>
          <span className="badge">Sandbox</span>
        </header>
        <nav className="shell-nav">
          <a className="tab" href="/underwrite">
            Underwrite
          </a>
          <a className="tab" href="/settings">
            Settings
          </a>
          <a className="tab" href="/sources">
            Sources
          </a>
          <a className="tab" href="/trace">
            Trace
          </a>
        </nav>
        <main className="shell-main">{children}</main>
      </body>
    </html>
  );
}

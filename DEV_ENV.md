\# HPS DealEngine - Dev Environment



This document describes how to get a development environment running for the HPS DealEngine monorepo, wired to the hosted Supabase project and canonical dev org.



---



\## 1. Project Overview



\- \*\*Repo:\*\* `hps-dealengine`

\- \*\*App:\*\* `apps/hps-dealengine` (Next.js 14, App Router)

\- \*\*Backend:\*\* Supabase (Postgres + RLS, Edge Functions)

\- \*\*Core Edge Functions (currently relevant):\*\*

&nbsp; - `v1-analyze`

&nbsp; - `v1-policy-get`

&nbsp; - `v1-policy-put`

&nbsp; - `v1-evidence-start`

&nbsp; - `v1-evidence-url`

&nbsp; - `v1-ai-bridge` (future explainability)

\- \*\*Dev Org:\*\* `HPS Dev Org`

\- \*\*Dev User:\*\* `underwriter@test.local` (created in Supabase Auth)



---



\## 2. Prerequisites



Install the following on your machine:



\- \*\*Node.js\*\* (LTS)

\- \*\*pnpm\*\* (`npm install -g pnpm` if needed)

\- \*\*Git\*\*

\- \*\*Supabase CLI\*\* (see Supabase docs for installation)



You also need:



\- Access to the Supabase project: \*\*`zjkihnihhqmnhpxkecpy`\*\*



---



\## 3. Clone \& Install



```bash

git clone <YOUR-REPO-URL> hps-dealengine

cd hps-dealengine



\# Install all workspace dependencies

pnpm install




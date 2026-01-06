# Production Readiness Checklist — Command Center V2.1

## Pre-Deployment Verification

### Build & Compilation

| Check | Command | Expected | Status |
|-------|---------|----------|--------|
| TypeScript Compile | `pnpm -w typecheck` | 0 errors | ☐ |
| ESLint | `pnpm -w lint` | 0 errors | ☐ |
| Production Build | `pnpm build` | Success | ☐ |
| Bundle Size | Check `.next/` | < 500KB first load | ☐ |

### Test Suites

| Suite | Command | Tests | Status |
|-------|---------|-------|--------|
| Unit Tests | `pnpm -w test portfolio-utils` | 66 pass | ☐ |
| Integration Tests | `pnpm -w test edge-functions` | 27 pass | ☐ |
| E2E Tests | `pnpm e2e` | 45 pass | ☐ |

### Database & Migrations

| Check | Verification | Status |
|-------|--------------|--------|
| Migrations Applied | Check Supabase dashboard | ☐ |
| dashboard_snapshots table exists | `SELECT * FROM dashboard_snapshots LIMIT 1` | ☐ |
| RLS Policies Active | Check policies in Supabase | ☐ |
| Indexes Created | Check index list | ☐ |

### Edge Functions

| Function | Deployed | Tested | Status |
|----------|----------|--------|--------|
| create-snapshot | ☐ | ☐ | ☐ |
| get-snapshot | ☐ | ☐ | ☐ |
| update-snapshot | ☐ | ☐ | ☐ |
| delete-snapshot | ☐ | ☐ | ☐ |
| run-analysis | ☐ | ☐ | ☐ |

### Environment Variables

| Variable | Scope | Set | Status |
|----------|-------|-----|--------|
| NEXT_PUBLIC_SUPABASE_URL | Client | ☐ | ☐ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Client | ☐ | ☐ |
| SUPABASE_SERVICE_ROLE_KEY | Server only | ☐ | ☐ |

---

## Feature Verification

### Portfolio Dashboard (/dashboard)

| Feature | Manual Test | Status |
|---------|-------------|--------|
| Page loads without error | Navigate to /dashboard | ☐ |
| Loading skeleton displays | Refresh page | ☐ |
| Metrics strip shows data | Check PortfolioPulse | ☐ |
| Deal cards render | Check grid | ☐ |
| Filter by status works | Select filter | ☐ |
| Filter by verdict works | Select filter | ☐ |
| Search works | Type address | ☐ |
| Sort works | Change sort field | ☐ |
| Click card navigates | Click any card | ☐ |
| Empty state displays | Filter to no results | ☐ |
| Error state displays | Disconnect network | ☐ |

### Deal Overview (/overview)

| Feature | Manual Test | Status |
|---------|-------------|--------|
| Page loads with dealId | Navigate to /overview?dealId=xxx | ☐ |
| VerdictCard displays | Check verdict section | ☐ |
| ScoreGauges animate | Watch gauges fill | ☐ |
| KeyMetrics show values | Check metrics grid | ☐ |
| SignalCards display | Check signals section | ☐ |
| Tab navigation works | Click each tab | ☐ |
| Loading state displays | Refresh page | ☐ |
| Error state displays | Use invalid dealId | ☐ |

### Responsive Design

| Viewport | Test | Status |
|----------|------|--------|
| Mobile (375px) | Portfolio dashboard | ☐ |
| Mobile (375px) | Deal overview | ☐ |
| Tablet (768px) | Portfolio dashboard | ☐ |
| Tablet (768px) | Deal overview | ☐ |
| Desktop (1280px) | Portfolio dashboard | ☐ |
| Desktop (1280px) | Deal overview | ☐ |

---

## Security Verification

### Authentication

| Check | Verification | Status |
|-------|--------------|--------|
| Unauthenticated users blocked | Logout and try /dashboard | ☐ |
| Session persists | Refresh after login | ☐ |
| JWT included in API calls | Check network tab | ☐ |

### RLS (Row-Level Security)

| Check | Verification | Status |
|-------|--------------|--------|
| User sees only own deals | Login as different user | ☐ |
| Cross-tenant blocked | Try accessing other org's deal | ☐ |
| Edge functions validate JWT | Check function logs | ☐ |

### Data Safety

| Check | Verification | Status |
|-------|--------------|--------|
| No service_role in client | Search codebase | ☐ |
| No secrets in client bundle | Check .next/static | ☐ |
| API errors don't leak data | Check error responses | ☐ |

---

## Performance Verification

### Page Load

| Page | Target | Actual | Status |
|------|--------|--------|--------|
| /dashboard | < 2s LCP | ___ms | ☐ |
| /overview | < 2s LCP | ___ms | ☐ |

### API Response Times

| Endpoint | Target | Actual | Status |
|----------|--------|--------|--------|
| GET /api/deals | < 500ms | ___ms | ☐ |
| GET snapshot | < 300ms | ___ms | ☐ |
| POST snapshot | < 500ms | ___ms | ☐ |

### Bundle Size

| Chunk | Target | Actual | Status |
|-------|--------|--------|--------|
| First Load JS | < 200KB | ___KB | ☐ |
| /dashboard page | < 50KB | ___KB | ☐ |
| /overview page | < 50KB | ___KB | ☐ |

---

## Documentation Verification

| Document | Location | Current | Status |
|----------|----------|---------|--------|
| Devlog | docs/devlog/ | V2.1 entry | ☐ |
| Architecture | docs/architecture/ | V2.1 docs | ☐ |
| Test Coverage | docs/testing/ | 138 tests | ☐ |
| Roadmap | docs/roadmap-v2.1-update.md | Updated | ☐ |
| README | README.md | Current | ☐ |

---

## Post-Deployment Monitoring

### Vercel

| Check | Setup | Status |
|-------|-------|--------|
| Deployment successful | Check Vercel dashboard | ☐ |
| Environment variables set | Check project settings | ☐ |
| Domain configured | Check domains | ☐ |

### Supabase

| Check | Setup | Status |
|-------|-------|--------|
| Edge functions deployed | Check functions tab | ☐ |
| Database healthy | Check dashboard | ☐ |
| Auth configured | Check auth settings | ☐ |

### Error Tracking (if applicable)

| Check | Setup | Status |
|-------|-------|--------|
| Sentry/similar configured | Check integration | ☐ |
| Source maps uploaded | Check releases | ☐ |
| Alerts configured | Check alert rules | ☐ |

---

## Rollback Plan

### If Issues Detected

1. **Revert Vercel deployment** to previous version
2. **Revert database migrations** (if needed):
   ```sql
   -- Only if absolutely necessary
   DROP TABLE IF EXISTS dashboard_snapshots;
   ```
3. **Notify stakeholders** of rollback
4. **Document issue** for post-mortem

### Rollback Commands

```bash
# Revert to previous Git commit
git revert HEAD

# Redeploy previous version
vercel rollback

# Revert Edge Functions (if needed)
supabase functions delete <function-name>
```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product | | | |

---

**Checklist Version:** 1.0.0
**Last Updated:** 2026-01-03
**Status:** Ready for Production Deployment

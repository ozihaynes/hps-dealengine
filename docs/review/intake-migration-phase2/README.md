# Intake Namespace Migration v1.0.0 → v1.1.0

## Problem
Intake data was being stored in the wrong JSONB namespaces in `deals.payload`:
- `payload.motivation.*` → should be `payload.seller.*`
- `payload.condition.*` → should be `payload.systems.*`
- `payload.financial.*` → should be `payload.debt.*` and `payload.foreclosure.*`

This caused intake data to be invisible in the UnderwriteTab UI.

## Solution
This migration moves existing data from old namespaces to new namespaces.

## Files

| File | Purpose |
|------|---------|
| `00_create_audit_table.sql` | Creates audit table to track changes |
| `00_dry_run_preview.sql` | Preview what would be migrated (no changes) |
| `01_migrate_namespaces.sql` | Main migration script (idempotent) |
| `02_cleanup_old_namespaces.sql` | Remove old namespaces (destructive) |
| `03_verify_migration.sql` | Verify migration results |
| `99_rollback.sql` | Undo migration if needed |

## Execution Order

### Step 1: Preview (Dry Run)
```sql
\i 00_dry_run_preview.sql
```
Review output to understand migration scope.

### Step 2: Create Audit Table
```sql
\i 00_create_audit_table.sql
```

### Step 3: Execute Migration
```sql
\i 01_migrate_namespaces.sql
```
This is idempotent - safe to run multiple times.

### Step 4: Verify Results
```sql
\i 03_verify_migration.sql
```
Check that data was correctly migrated.

### Step 5: Cleanup (AFTER 7+ days verification)
```sql
\i 02_cleanup_old_namespaces.sql
```
⚠️ This is destructive and removes old data!

## Rollback
If migration fails:
```sql
\i 99_rollback.sql
```

## Safety Features
- ✅ **Idempotent**: Safe to run multiple times
- ✅ **Audited**: All changes logged to `_migration_audit_v1_1_0`
- ✅ **Dynamic year**: Uses `CURRENT_DATE`, not hardcoded
- ✅ **NULL-safe**: Uses `COALESCE` on all operations
- ✅ **Preserves old data**: Old namespaces kept until cleanup
- ✅ **Rollback available**: Can undo if needed

## Field Mappings

| Old Path | New Path | Transform |
|----------|----------|-----------|
| `motivation.reason` | `seller.reason_for_selling` | none |
| `motivation.timeline` | `seller.seller_timeline` | none |
| `motivation.notes` | `seller.seller_notes` | none |
| `seller.strike_price` | `seller.lowest_acceptable_price` | none |
| `condition.overall` | `systems.overall_condition` | none |
| `condition.roof_age_years` | `systems.roof_year_installed` | current_year - age |
| `condition.hvac_age_years` | `systems.hvac_year_installed` | current_year - age |
| `condition.repair_notes` | `systems.repair_notes` | none |
| `financial.mortgage_balance` | `debt.senior_principal` | none |
| `financial.monthly_payment` | `debt.monthly_payment` | none |
| `financial.in_foreclosure` | `foreclosure.is_in_foreclosure` | none |
| `financial.foreclosure_sale_date` | `foreclosure.auction_date` | none |
| `financial.behind_on_payments` | `foreclosure.behind_on_payments` | none |
| `financial.asking_price` | `market.asking_price` | none |

# Input Forms & Fields Audit
Date: 2026-01-03
Auditor: Claude Code

## Overview

Input forms capture deal data, client information, and property details. Forms are located in `apps/hps-dealengine/components/` and `apps/hps-dealengine/app/`.

---

## Form Inventory

### 1. NewDealForm.tsx

**Location:** `apps/hps-dealengine/components/deals/NewDealForm.tsx`

**Purpose:** Create new deal records.

**Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| clientName | text | Yes | min 1 char |
| clientPhone | tel | No | phone format |
| clientEmail | email | No | email format |
| propertyStreet | text | Yes | min 1 char |
| propertyCity | text | Yes | min 1 char |
| propertyState | select | Yes | 2-char state code |
| propertyPostalCode | text | Yes | 5-digit ZIP |

**State Type:**
```typescript
type NewDealFormState = {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  propertyStreet: string;
  propertyCity: string;
  propertyState: string;
  propertyPostalCode: string;
};
```

---

### 2. LoginForm.tsx

**Location:** `apps/hps-dealengine/app/login/LoginForm.tsx`

**Purpose:** User authentication.

**Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | email | Yes | email format |
| password | password | Yes | min 1 char |

**Features:**
- Auto sign-up for dev environment
- Redirect handling
- SSO placeholders (Google, Apple)

---

### 3. IntakeForm.tsx

**Location:** `apps/hps-dealengine/components/intake/IntakeForm.tsx`

**Purpose:** Multi-section client intake form (public-facing).

**Dynamic Schema:** Form fields are defined by `IntakeSchemaApi`:

```typescript
type IntakeSchemaApi = {
  sections: Array<{
    id: string;
    title: string;
    fields: IntakeFieldApi[];
  }>;
  evidence_uploads?: EvidenceUploadConfig[];
};

type IntakeFieldApi = {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'currency' | 'select' | 'multiselect' | 'date' | 'textarea' | 'address';
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
  condition?: { field: string; equals: unknown };
};
```

**Default Intake Fields (typical schema):**

| Section | Field | Type | Required |
|---------|-------|------|----------|
| Contact | contact_name | text | Yes |
| Contact | contact_email | email | No |
| Contact | contact_phone | phone | No |
| Property | street_address | address | Yes |
| Property | city | text | Yes |
| Property | state | select | Yes |
| Property | zip | text | Yes |
| Property | property_type | select | Yes |
| Property | bedrooms | number | No |
| Property | bathrooms | number | No |
| Property | sqft | number | No |
| Property | year_built | number | No |
| Financial | asking_price | currency | No |
| Financial | mortgage_balance | currency | No |
| Financial | monthly_payment | currency | No |
| Financial | property_taxes | currency | No |
| Situation | timeline | select | Yes |
| Situation | reason_for_selling | multiselect | No |
| Situation | property_condition | select | Yes |

**Features:**
- Section navigation
- Auto-save (drafts)
- Conditional field visibility
- Address autocomplete
- File upload zones
- Validation per field type

---

### 4. IntakeFormSection.tsx

**Location:** `apps/hps-dealengine/components/intake/IntakeFormSection.tsx`

**Purpose:** Renders individual form sections.

**Supported Field Types:**

| Type | Input Component | Validation |
|------|-----------------|------------|
| text | `<input type="text">` | minLength |
| email | `<input type="email">` | email regex |
| phone | `<input type="tel">` | phone format |
| number | `<input type="number">` | min/max |
| currency | Custom currency input | min/max, formatting |
| select | `<select>` | options required |
| multiselect | Custom multi-select | array |
| date | `<input type="date">` | date format |
| textarea | `<textarea>` | minLength |
| address | AddressAutocomplete | auto-populates city/state/zip |

---

### 5. IntakeFormField.tsx

**Location:** `apps/hps-dealengine/components/intake/IntakeFormField.tsx`

**Purpose:** Individual field renderer with label and error display.

---

### 6. FileUploadZone.tsx

**Location:** `apps/hps-dealengine/components/intake/FileUploadZone.tsx`

**Purpose:** Evidence file upload interface.

**Props:**
```typescript
type FileUploadZoneProps = {
  token: string;
  linkId: string;
  uploadKey: string;
  label: string;
  accept?: string[];
  maxFiles?: number;
  files: UploadFile[];
  onFilesChange: (files: UploadFile[]) => void;
  onUploadStart: (file: File) => Promise<UploadStartResult>;
  onUploadComplete: (fileId: string) => Promise<UploadCompleteResult>;
  disabled?: boolean;
};
```

**Supported File Types:**
- PDF documents
- Images (JPG, PNG)
- Word documents

---

## Sandbox Forms (Policy Configuration)

### SandboxSettingsForm

**Location:** `apps/hps-dealengine/components/sandbox/`

**Purpose:** Configure policy tokens for analysis.

**Token Categories:**

| Category | Token Count | Examples |
|----------|-------------|----------|
| Valuation | 10+ | aivSafetyCapPct, arvHardMax |
| Floors | 6+ | floorInvestorAivDiscountP20Zip |
| Spreads | 8+ | wholesaleTargetMarginPct |
| Carry | 4+ | carryMonthsMaximumCap |
| Workflow | 4+ | cashPresentationGateMinSpread |
| Gates | 6+ | bankruptcyStayGateLegalBlock |

---

## Import Forms

### ImportWizard Column Mapping

**Location:** `apps/hps-dealengine/components/import/ImportWizard.tsx`

**Purpose:** Map CSV columns to deal fields.

**Mappable Fields:**

| Target Field | Required | Description |
|--------------|----------|-------------|
| street | Yes | Property street address |
| city | Yes | Property city |
| state | Yes | 2-char state code |
| zip | Yes | 5-digit ZIP code |
| client_name | No | Client name |
| client_phone | No | Client phone |
| client_email | No | Client email |
| asking_price | No | Seller asking price |
| mortgage_balance | No | Current mortgage |
| sqft | No | Square footage |
| bedrooms | No | Bedroom count |
| bathrooms | No | Bathroom count |
| year_built | No | Year built |

---

## Underwrite Input Fields

### Property Details (via payload_json)

| Field Path | Type | Description |
|------------|------|-------------|
| property.street | string | Street address |
| property.city | string | City |
| property.state | string | State code |
| property.zip | string | ZIP code |
| property.sqft | number | Square footage |
| property.beds | number | Bedrooms |
| property.baths | number | Bathrooms |
| property.year_built | number | Year built |
| property.lot_sqft | number | Lot size |
| property.pool | boolean | Has pool |
| property.garage | number | Garage spaces |

### Market Data (via payload_json)

| Field Path | Type | Description |
|------------|------|-------------|
| market.arv | number | After Repair Value |
| market.aiv | number | As-Is Value |
| market.dom_zip | number | Days on Market (ZIP) |
| market.moi_zip | number | Months of Inventory |
| market.price_to_list_pct | number | Price-to-List ratio |

### Payoff Data (via payload_json)

| Field Path | Type | Description |
|------------|------|-------------|
| payoff.mortgage_balance | number | First mortgage |
| payoff.second_mortgage | number | Second mortgage |
| payoff.other_liens | number | Other liens |
| payoff.hoa_arrears | number | HOA arrears |
| payoff.tax_arrears | number | Tax arrears |

### Repair Data (via payload_json)

| Field Path | Type | Description |
|------------|------|-------------|
| repairs.total | number | Total repair estimate |
| repairs.breakdown | object | Line-item breakdown |
| repairs.contingency_pct | number | Contingency percentage |

---

## Evidence Upload Fields

### Evidence Kinds

| Kind | Required for Grade A | Max Age (Days) |
|------|---------------------|----------------|
| payoff_letter | Yes | 30 |
| title_commitment | Yes | 60 |
| insurance_quote | Conditional | 30 |
| four_point_inspection | Conditional | 90 |
| repair_estimate | No | 60 |
| photos | No | N/A |
| contract | No | N/A |

---

## Summary

| Form Category | Form Count | Total Fields |
|---------------|------------|--------------|
| Deal Creation | 1 | 7 |
| Authentication | 1 | 2 |
| Intake (Public) | 3 | 20+ dynamic |
| Import Mapping | 1 | 13 |
| Sandbox Config | 1 | 30+ |
| **Total** | **7** | **70+** |

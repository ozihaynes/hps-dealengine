# New Deal Form Fields Audit

## Source Files
- **Component**: `apps/hps-dealengine/components/deals/NewDealForm.tsx`
- **Types**: `apps/hps-dealengine/lib/deals.ts`
- **Create Function**: `createDealWithClientInfo()` in `deals.ts`

## Form State Type (NewDealFormState)
```typescript
export type NewDealFormState = {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  propertyStreet: string;
  propertyCity: string;
  propertyState: string;
  propertyPostalCode: string;
};
```

## Form Fields (7 fields)

### Client Information Section
| Field | Label | Type | Required |
|-------|-------|------|----------|
| clientName | Client Name | text | Yes |
| clientPhone | Phone Number | tel | No |
| clientEmail | Email | email | No |

### Property Information Section
| Field | Label | Type | Required |
|-------|-------|------|----------|
| propertyStreet | Property Street | address autocomplete | Yes |
| propertyCity | City | text | auto-filled |
| propertyState | State | text | auto-filled |
| propertyPostalCode | ZIP | text | auto-filled |

## Data Mapping to Deal

When form is submitted, `createDealWithClientInfo()` maps fields to:

### Top-Level Deal Columns (Supabase)
| Form Field | Deal Column |
|------------|-------------|
| propertyStreet | `address` |
| propertyCity | `city` |
| propertyState | `state` |
| propertyPostalCode | `zip` |
| clientName | `client_name` |
| clientPhone | `client_phone` |
| clientEmail | `client_email` |

### Deal Payload (JSON blob)
```typescript
payload = {
  contact: { name, phone, email },
  client: { name, phone, email },  // duplicate of contact
  property: {
    address: propertyStreet,
    city: propertyCity,
    state: propertyState,
    zip: propertyPostalCode,
  },
  posture: posture,  // if provided
}
```

## Validation Rules
All 7 fields are validated as required in `validateNewDealForm()`:
- Client name: required
- Phone: required (despite form showing as optional)
- Email: required (despite form showing as optional)
- Property street: required
- Property city: required
- Property state: required
- Property ZIP: required

## Notes
- Uses AddressAutocomplete component for property address
- Address selection auto-populates city/state/zip
- Form is used in deal creation modal
- This is the **internal staff** form, not the client-facing intake form

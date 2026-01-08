# Accessibility Audit — Settings Page

**Date:** [Fill after testing]
**Tester:** [Your name]
**Standard:** WCAG 2.1 Level AA
**Tool:** axe-core DevTools, manual keyboard testing

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Perceivable | ⬜ PENDING | |
| Operable | ⬜ PENDING | |
| Understandable | ⬜ PENDING | |
| Robust | ⬜ PENDING | |

---

## Automated Testing (axe-core)

**Run this in browser DevTools console:**
```javascript
// Install axe-core if not present
// Then run:
axe.run().then(results => console.log(results));
```

**Results:**
- Violations: [Count]
- Passes: [Count]
- Incomplete: [Count]

---

## Manual Checklist

### 1. Perceivable

- [ ] **1.1.1 Non-text Content**
  - All images have alt text
  - Decorative icons have `aria-hidden="true"`
  - Form icons have labels

- [ ] **1.3.1 Info and Relationships**
  - Form labels associated with inputs
  - Headings in logical order
  - Lists use semantic markup

- [ ] **1.4.3 Contrast (Minimum)**
  - Text contrast ratio ≥ 4.5:1
  - UI component contrast ≥ 3:1
  - Tool used: [WebAIM Contrast Checker]

### 2. Operable

- [ ] **2.1.1 Keyboard**
  - All functionality available via keyboard
  - No keyboard traps
  - Tab order logical

- [ ] **2.1.2 No Keyboard Trap**
  - Can Tab through entire page
  - Escape closes modals/dialogs
  - Focus returns after dialog close

- [ ] **2.4.7 Focus Visible**
  - Focus indicator visible on all elements
  - Focus ring contrast sufficient

### 3. Understandable

- [ ] **3.3.1 Error Identification**
  - Errors clearly identified
  - Error text describes problem
  - Error associated with field

- [ ] **3.3.2 Labels or Instructions**
  - All inputs have labels
  - Required fields indicated
  - Help text available where needed

### 4. Robust

- [ ] **4.1.2 Name, Role, Value**
  - Custom components have ARIA roles
  - State changes announced
  - Values programmatically determinable

- [ ] **4.1.3 Status Messages**
  - Toast notifications use `aria-live`
  - Error messages use `role="alert"`
  - Success messages announced

---

## Issues Found

| # | WCAG | Severity | Element | Issue | Fix |
|---|------|----------|---------|-------|-----|
| 1 | | | | | |
| 2 | | | | | |

---

## Sign-Off

- [ ] All Critical issues fixed
- [ ] All Serious issues fixed or documented
- [ ] Moderate issues tracked for future

**Approved by:** _________________
**Date:** _________________

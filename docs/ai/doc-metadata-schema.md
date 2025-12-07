---
doc_id: "ai.doc-metadata-schema"
category: "ai"
audience: ["ai-assistant", "engineer", "product"]
trust_tier: 1
summary: "Frontmatter schema used across docs so AI and humans can route by category, audience, and trust tier."
---

# Doc Metadata Schema for AI — HPS DealEngine

Use this lightweight frontmatter on every doc so AI (and humans) can route to the right source and understand trust levels.

```md
---
doc_id: "<namespace.slug>"
category: "<product|domain|engine|app|dashboard|glossary|examples|playbooks|ai|ops>"
audience: ["ai-assistant", "engineer", "underwriter", "exec", "product", "ops"]
trust_tier: <0-3>
summary: "<1-2 sentence summary, plain language>"
---
```

- **doc_id:** `category.filename-slug` (e.g., `domain.wholesale-underwriting-handbook`); keep unique and stable.
- **category:** use the provided enum so downstream tools can filter quickly.
- **audience:** pick the most relevant roles; include `ai-assistant` when the doc should guide AI responses.
- **trust_tier (priority when sources conflict):**
  - `0` = math/contracts/official underwriting manuals (hard source of truth).
  - `1` = engine/app architecture, flows, KPIs, ops runbooks (strongly trusted for behavior).
  - `2` = product vision, personas, examples, playbooks (great context, not math authority).
  - `3` = external references, speculative ideas, notes (use with caution, cite source).
- Rule: when sources disagree, prefer the lowest `trust_tier` number; always note conflicts for humans to reconcile.

# HPS DealEngine – Negotiation Strategy Matrix / Pre‑Emptive Logic Tree (Spec v1)

## 1. Purpose

This spec defines the **Negotiation Strategy Matrix / Pre‑Emptive Logic Tree** for HPS DealEngine.

It is designed to:

- Map **Deal Facts → Pre‑Emptive Scripts** in a structured JSON/CSV dataset.
- Teach AI how to:
  - build trust and perceived competence,
  - justify a below‑market offer using existing engine outputs,
  - soften and pre‑handle likely objections *before* they surface.
- Keep all scripts strictly within HPS constraints:
  - No invented numbers or hidden offer changes.
  - All math (ARV, AIV, MAO bundle, floors/ceilings, spreads, payoff, carry, DTM) comes from the engine and policy snapshots.
  - AI is a **Tactical Acquisition Agent / strategist**, not a calculator or closer.
  - Behavior matches AI governance docs (assistant‑behavior‑guide, prompting‑patterns, data‑sources-and-trust-tiers).

The output of this spec is a dataset used by Negotiation Playbook / Strategist agents to select and render scripts deterministically based on deal facts.

---

## 2. HPS Constraints for Negotiation AI

1. **Engine and policies are the source of truth**

   - Numeric anchors come only from:
     - `AnalyzeOutput` and trace (ARV, AIV, MAO bundle, floors/ceilings, spreads, payoff, DTM, carry months, Market Temp, risk and evidence summaries),
     - org/posture policies and sandbox knobs,
     - stored evidence (payoff letters, title docs, bids, insurance quotes).
   - Scripts may **reference** these values via placeholders like `{arv}`, `{aiv}`, `{repairs_total}`, `{buyer_ceiling}`, `{respect_floor}`, `{spread_cash}`, `{payoff_projected}`, `{dtm}`, `{carry_total}`, `{market_temp_label}`, `{risk_summary_label}`, but must **never recompute** them.

2. **AI is advisory, not a calculator**

   - AI provides **language, framing, sequencing, and questions**, not math.
   - AI may not:
     - change MAO or any numeric outputs,
     - override risk gates or workflow states,
     - relax policy knobs or sandbox settings.

3. **Determinism & auditability**

   - Given the same:
     - deal facts,
     - policy snapshot,
     - engine version,
     - dataset row,
   - the agent must produce the **same script**.
   - Every generated script should be attributable to:
     - a `run_id`,
     - a `logic_row_id` from the dataset,
     - the active `policy_version`.

4. **Compliance, respect, and safety**

   - Scripts must:
     - be professional, non‑abusive, and non‑discriminatory,
     - avoid legal/tax advice,
     - never pressure sellers to violate laws or program rules (FIRPTA, SCRA, condo/project rules, Flood 50% Rule, etc.).
   - When risk gates are in **Fail** or critical **Watch**, scripts should default to conservative, transparent language and suggest review by a human manager or attorney when appropriate.

---

## 3. Persona & Tone – Tactical Acquisition Agent

### 3.1 Persona

- Role: **Tactical Acquisition Agent** for a disciplined underwriting shop.
- Style: **Empathetic yet Firm**:
  - listens, reflects, and labels emotions,
  - calmly walks through the math and risk picture,
  - is willing to walk away if the deal doesn’t fit policy.
- Identity: Sounds like an **objective auditor** or underwriter, not a hypey salesperson.

### 3.2 Negotiation patterns used

The logic tree draws from industry‑standard negotiation concepts:

- **Tactical Empathy & Labeling** – explicitly acknowledging feelings and perspectives (“It sounds like…”, “It looks like…”) before steering back to data and options.  
- **Accusation Audit** – pre‑emptively naming the negative things the seller might be thinking (“You’re probably worried this will sound like a lowball…”) to defuse them early.
- **Ackerman‑style price anchoring** – presenting offers as the result of a structured process with precise numbers and constrained concessions (first offer low, then controlled increments, final number precise rather than round).
- **Negative Reverse (Sandler)** – when motivation appears low, gently suggesting *not* selling and seeing whether the seller pulls the deal back toward a sale.

The dataset doesn’t implement these models mathematically; it encodes **language patterns** consistent with them while always staying inside HPS policies.

### 3.3 Tone rules

- Always:
  - Lead with **facts and evidence** (condition, repairs, payoff, arrears, DTM, Market Temp, risk gates).
  - Use **plain English** (“what the numbers say”) instead of internal jargon.
  - Separate the *math* from the *relationship* (“the calculator is blunt, but honest”).
  - Acknowledge trade‑offs and uncertainty; invite questions.

- Never:
  - Apologize for policy or math.
  - Blame the seller or property.
  - Promise outcomes that conflict with risk gates, evidence, or timeline constraints.

---

## 4. Normalized HPS Deal Facts (Inputs)

The dataset indexes rows by **bands and flags**, not raw continuous numbers. These bands must be derivable from HPS data (engine outputs, runs, evidence, policies).

### 4.1 Condition & Repairs

- `condition_band`: `light` | `medium` | `heavy` | `hazardous`
- `repairs_band`: `low` | `medium` | `high` | `extreme`
- `repair_evidence`: `bids_present` | `estimator_only` | `photos_only` | `none`
- Optional flags:
  - `has_big5_issues`: boolean (roof/HVAC/plumbing/electrical/foundation)
  - `flood_50pct_implicated`: boolean

### 4.2 Seller Motivation & Situation

- `status_in_foreclosure`: `true | false`
- `seller_motivation_primary`:
  - `avoid_auction` | `debt_relief` | `tired_landlord` | `relocation` | `inheritance` | `equity_cash_out` | `divorce` | `code_violations` | `other`
- `motivation_strength`: `low` | `medium` | `high`
- Optional:
  - `has_alt_offer_reported`: boolean
  - `reported_alt_offer_strength`: `weak` | `similar` | `strong` | `unknown`

### 4.3 Timeline & Urgency

- `timeline_urgency`: `emergency` | `critical` | `high` | `low`
  - Typically derived from DTM bands (e.g., `emergency` for very short runway, `low` when flexible).
- `timeline_trigger`: `auction` | `move_date` | `tax_sale` | `vacancy_burn` | `none`
- Optional:
  - `has_board_approval`: boolean (for condos/HOAs)
  - `board_approval_risk`: `low` | `medium` | `high`

### 4.4 Debt, Payoff & Arrears

- `arrears_band`: `none` | `low` | `moderate` | `high` | `critical`
- `shortfall_vs_payoff_band`: `big_cushion` | `thin` | `shortfall`
  - Derived from payoff vs net proceeds at MAO.
- Optional:
  - `has_junior_liens`: boolean
  - `has_pace_or_ucc`: boolean

### 4.5 Market & Risk Context

- `zip_speed_band`: `fast` | `neutral` | `slow`
- `market_temp_label`: `hot` | `warm` | `neutral` | `cool`
- `confidence_grade`: `A` | `B` | `C`
- `risk_flags`: array of gate‑level tags:
  - `uninsurable` | `condo_sirs` | `pace` | `solar_ucc` | `fha_90_day` | `flood_50pct` | `manufactured` | `firpta` | `scra` | `title_cloudy`

### 4.6 Relationship Context (optional but useful)

- `lead_channel`: `inbound_call` | `web_form` | `sms` | `ppc` | `referral` | `repeat_seller`
- `trust_level`: `cold` | `lukewarm` | `warm` | `repeat_seller`

---

## 5. Objection Types (Pre‑Handled, Not Reactively Handled)

Each row targets **one primary objection** that we want to reduce *before* it appears:

- `offer_too_low_vs_zillow`
- `offer_too_low_vs_what_i_owe`
- `offer_too_low_vs_repairs_i_think`
- `i_have_higher_offer`
- `i_need_to_talk_to_spouse`
- `i_can_wait_it_out`
- `youre_lowball_investors`
- `i_dont_trust_investors`
- `i_dont_need_to_sell`
- `fees_and_costs_confusion`
- `closing_timing_concerns`

The dataset expresses **objection inoculation** patterns: we explicitly reference the likely concern and tie it to **deal facts** (condition, timeline, arrears, risk gates) before revealing numbers.

---

## 6. Logic Modules

Each dataset row belongs to one of four modules:

```text
module ∈ {
  "competence",      # trust-building, audit-style framing
  "price_anchor",    # math bridge and MAO presentation
  "objection_pivot", # emotional labeling + data pivot
  "negative_reverse" # motivation testing when motivation is low
}
```

### 6.1 Module: Competence / Trust (Audit‑Style Language)

**Goal:** Make the seller feel they’re dealing with a competent professional who understands the situation before any price is mentioned.

**Patterns:**

- Start with a neutral, audit‑style overview: “Let me walk you through what the numbers are telling us about the property.”
- Reference evidence (photos, bids, payoff letter, tax bill, inspection, risk gates).
- Use tactical empathy (labels) to legitimize emotion, then gently anchor back to policy.

**Required fields per row:**

- `module`: `"competence"`
- `competence_focus`: `repairs | timeline | debt | market_speed | risk`
- `trigger_timing`: `before_any_numbers | after_smalltalk_before_offer`
- `trigger_phrase`: 1–2 sentence opener.
- `script_body`: 2–6 sentences, first‑person, referencing semantic placeholders: `{repairs_total}`, `{payoff_projected}`, `{dtm}`, `{carry_total}`, `{market_temp_label}`, `{risk_summary_label}`.
- `followup_question`: calibrated question checking alignment, e.g., “How does that line up with what you’ve been dealing with on your side?”

### 6.2 Module: Price Anchor (Ackerman‑Style MAO Presentation)

**Goal:** Present the MAO as the logical output of the underwriting engine, not a whimsical lowball number.

**Patterns (informed by Ackerman bargaining):**

- Walk through the inputs (ARV/AIV, repairs, carry, resale costs, risk) before disclosing any offer.
- Use precise engine numbers (e.g., $137,850) rather than round estimates to make the figure feel calculated and deliberate.
- Acknowledge constraints: investor margin, risk buffers, policy guardrails.

**Required fields per row:**

- `module`: `"price_anchor"`
- `ackerman_stage`: `first_number | second_number | final_number`
- `preemptive_objection`: primary objection being inoculated (from §5).
- `trigger_timing`: `before_first_offer | before_counter_offer | before_final_position`
- `trigger_phrase`: bridge into the math.
- `script_body`: 3–8 sentences that tie `{arv}`, `{aiv}`, `{repairs_total}`, `{buyer_ceiling}`, `{respect_floor}`, `{spread_cash}`, `{market_temp_label}`, `{dtm}` together, explain why offers must sit below `{buyer_ceiling}`, present MAO as “where the engine says we can realistically land.”
- `cushioning_statement`: soft line immediately before the number, e.g., “With all of that in mind, here’s the number our underwriting engine can actually support.”
- `followup_question`: optional; used to confirm understanding of the math.

### 6.3 Module: Objection Pivot (Tactical Empathy)

**Goal:** Name and legitimize the likely objection and pivot back to hard deal facts (timeline, condition, debt, market speed, risk) before the seller says it.

**Patterns:**

- Label the concern: “Most people in your spot are worried this could feel like a lowball.”
- Validate it as normal.
- Pivot to the underlying constraint: auction timeline, arrears, heavy repairs, slow ZIP, risk gates, etc.

**Required fields per row:**

- `module`: `"objection_pivot"`
- `preemptive_objection`: from §5.
- `pivot_focus`: `timeline | condition | repairs | debt | market_speed | risk_gates`
- `trigger_timing`: `after_competence_frame_before_offer | after_first_offer_before_silence`
- `trigger_phrase`: inoculation line.
- `script_body`: 3–7 sentences: 1–2 sentences of empathy/labeling, 2–5 sentences anchoring to deal facts and policy.
- `followup_question`: calibrated, open question pulling the seller back into reality: “Where does that leave you if the auction date doesn’t move?”

### 6.4 Module: Negative Reverse (Motivation Test)

**Goal:** When motivation is low, softly “push away” the deal to see if the seller pulls it back, clarifying whether it’s worth moving forward.

**Patterns:**

- Start with a disarming humility: “I might be reading this wrong, but…”
- Suggest not selling, while gently surfacing risk/cost of doing nothing.
- Let silence and curiosity do the work.

**Required fields per row:**

- `module`: `"negative_reverse"`
- `motivation_strength`: must be `low` or `medium`.
- Optional: `risk_context`: `foreclosure_clock | rising_arrears | tenant_issues | slow_market | heavy_repairs`
- `trigger_timing`: `after_low_engagement_signals | after_seller_resists_data`
- `trigger_phrase`: short opener.
- `script_body`: 2–5 sentences exploring the “do nothing” path and its trade‑offs.
- `followup_question`: open, non‑pushy question, e.g., “If you just hold onto it and do nothing for the next year, what feels like the upside and what worries you about that?”

---

## 7. JSON Dataset Shape

The dataset is a single JSON file with this shape:

```json
{
  "version": "v1",
  "created_at": "YYYY-MM-DDTHH:MM:SSZ",
  "description": "HPS DealEngine Negotiation Strategy Matrix / Pre-Emptive Logic Tree",
  "rows": [
    {
      "id": "unique_machine_readable_id",
      "module": "competence | price_anchor | objection_pivot | negative_reverse",
      "scenario_label": "Short human-readable name",

      "deal_facts": {
        "condition_band": "light | medium | heavy | hazardous",
        "repairs_band": "low | medium | high | extreme",
        "repair_evidence": "bids_present | estimator_only | photos_only | none",
        "has_big5_issues": true,
        "status_in_foreclosure": true,
        "seller_motivation_primary": "avoid_auction | debt_relief | tired_landlord | relocation | inheritance | equity_cash_out | divorce | code_violations | other",
        "motivation_strength": "low | medium | high",
        "timeline_urgency": "emergency | critical | high | low",
        "timeline_trigger": "auction | move_date | tax_sale | vacancy_burn | none",
        "arrears_band": "none | low | moderate | high | critical",
        "shortfall_vs_payoff_band": "big_cushion | thin | shortfall",
        "zip_speed_band": "fast | neutral | slow",
        "market_temp_label": "hot | warm | neutral | cool",
        "confidence_grade": "A | B | C",
        "risk_flags": [
          "uninsurable",
          "condo_sirs",
          "pace",
          "solar_ucc",
          "fha_90_day",
          "flood_50pct",
          "manufactured",
          "firpta",
          "scra",
          "title_cloudy"
        ],
        "lead_channel": "inbound_call | web_form | sms | ppc | referral | repeat_seller",
        "trust_level": "cold | lukewarm | warm | repeat_seller"
      },

      "preemptive_objection": "see list in §5",
      "trigger_timing": "see module-specific options in §6",
      "competence_focus": "repairs | timeline | debt | market_speed | risk | null",
      "ackerman_stage": "first_number | second_number | final_number | null",
      "pivot_focus": "timeline | condition | repairs | debt | market_speed | risk_gates | null",
      "motivation_context": "optional free-text notes",

      "trigger_phrase": "Short opener line",
      "script_body": "Full talk-track with {placeholders} for engine numbers and summary labels.",
      "cushioning_statement": "Sentence before price (price_anchor only, nullable for others).",
      "followup_question": "Calibrated question to close the loop (may be null).",
      "notes_for_ai": "Meta-instructions for the AI about delivery, pacing, and when to skip this row."
    }
  ]
}
```

Notes:

- `script_body` is always a single-speaker monologue in first person (“we”/“I”), not a back‑and‑forth dialogue.
- Placeholders are semantic tokens, not magic numbers: `{arv}`, `{aiv}`, `{repairs_total}`, `{buyer_ceiling}`, `{respect_floor}`, `{spread_cash}`, `{payoff_projected}`, `{dtm}`, `{carry_total}`, `{market_temp_label}`, `{risk_summary_label}`.
- At runtime, the Negotiation Agent:
  - selects one or more rows whose `deal_facts` bands match the current run,
  - injects real numbers and labels from engine outputs and trace into the placeholders,
  - returns the final string plus a reference to `row.id` for logging/audit.

---

## 8. CSV Template Shape

For convenience, the dataset can also be represented as CSV with the following header (see `negotiation-matrix.template.csv`):

```text
id,module,scenario_label,
condition_band,repairs_band,repair_evidence,has_big5_issues,
status_in_foreclosure,seller_motivation_primary,motivation_strength,
timeline_urgency,timeline_trigger,
arrears_band,shortfall_vs_payoff_band,
zip_speed_band,market_temp_label,confidence_grade,risk_flags,
lead_channel,trust_level,
preemptive_objection,trigger_timing,competence_focus,ackerman_stage,pivot_focus,motivation_context,
trigger_phrase,script_body,cushioning_statement,followup_question,notes_for_ai
```

CSV rows map directly to the JSON fields.

---

## 9. Example Rows (Abbreviated)

The accompanying `negotiation-matrix.example.json` file contains concrete examples for at least:

- Competence – in‑foreclosure, heavy repairs, emergency timeline.
- Price Anchor – tired landlord, medium repairs, neutral market, MAO below payoff but still net positive.
- Negative Reverse – equity landlord, slow market, low motivation.
- Objection Pivot – seller expecting Zillow price with high repairs and slow ZIP.

These are not canonical policies; they illustrate structure, tone, and placeholder usage so the research agent can expand the matrix with more rows.

---

## 10. How a Research Agent Should Use This Spec

When a separate research/authoring agent is asked to “populate the Negotiation Strategy Matrix,” it should:

1. Use this spec plus HPS underwriting/AI docs as ground truth.
2. Design scripts that:
   - explicitly tie back to deal facts and policy outcomes,
   - pre‑empt likely objections instead of reacting,
   - preserve respect and transparency.
3. Fill rows in a new JSON dataset following `negotiation-matrix.schema.json`.
4. Provide clear, testable coverage across combinations of:
   - condition/repairs bands,
   - motivation + timeline bands,
   - arrears/shortfall bands,
   - Market Temp and zip speed,
   - risk flags and confidence grades.

This spec is the contract. Any new dataset must satisfy the JSON schema and remain consistent with the persona, tone, and constraints above.

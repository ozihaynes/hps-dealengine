# Negotiation Strategy Matrix / Pre‑Emptive Logic Tree

This folder contains the **spec and data shapes** for the HPS DealEngine Negotiation Strategy Matrix.

Purpose:

- Teach AI assistants how to turn **deal facts** into **pre‑emptive negotiation language**.
- Provide a structured JSON/CSV dataset where each row =
  - a specific scenario (bands of condition, repairs, motivation, timeline, arrears, risk, Market Temp),
  - mapped to a **single pre‑emptive script** (audit‑style, empathetic, policy‑aligned).
- Keep all negotiation behavior consistent with:
  - HPS underwriting manuals,
  - engine outputs and risk gates,
  - AI governance docs (assistant‑behavior‑guide, prompting‑patterns, data‑sources-and-trust-tiers).

Key components:

- `spec-negotiation-matrix.md` – human‑readable spec.
- `negotiation-matrix.schema.json` – JSON Schema for validating datasets.
- `negotiation-matrix.example.json` – small sample dataset showing expected depth.
- `negotiation-matrix.template.csv` – header row for CSV exports/imports.

Downstream:

- A separate research/authoring agent will populate a larger JSON dataset following this spec.
- Runtime AI agents (e.g., Deal Analyst / Negotiation Playbook) will:
  - read **deal facts** from engine outputs, runs, and evidence summaries,
  - select matching rows from the dataset,
  - render `script_body` with numeric placeholders filled from the engine (e.g., `{arv}`, `{repairs_total}`, `{buyer_ceiling}`),
  - present the script to humans for review and delivery.

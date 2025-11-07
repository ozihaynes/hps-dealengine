DO $$
BEGIN
  -- org
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = '6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2') THEN
    INSERT INTO public.organizations (id, name)
    VALUES ('6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2', 'HPS QA');
  END IF;

  -- membership for QA user as VP
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE org_id = '6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2'
      AND user_id = '52a1b235-0761-4b05-b765-f3df1a324387'
  ) THEN
    INSERT INTO public.memberships (org_id, user_id, role)
    VALUES ('6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2', '52a1b235-0761-4b05-b765-f3df1a324387', 'vp');
  END IF;
END$$;

-- seed a base policy version with tokenized fields + tokens map
INSERT INTO public.policy_versions (org_id, posture, policy_json, change_summary, created_by)
VALUES (
  '6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2',
  'base',
  $${
    "tokens": {
      "<AIV_CAP_PCT>": 0.97,
      "<DOM_TO_MONTHS_RULE>": "DOM/30",
      "<CARRY_MONTHS_CAP>": 5,
      "<LIST_COMM_PCT>": 0.03,
      "<CONCESSIONS_PCT>": 0.02,
      "<SELL_CLOSE_PCT>": 0.015
    },
    "aiv":   { "safety_cap_pct_token": "<AIV_CAP_PCT>" },
    "carry": { "dom_to_months_rule_token": "<DOM_TO_MONTHS_RULE>", "months_cap_token": "<CARRY_MONTHS_CAP>" },
    "fees":  {
      "list_commission_pct_token": "<LIST_COMM_PCT>",
      "concessions_pct_token":     "<CONCESSIONS_PCT>",
      "sell_close_pct_token":      "<SELL_CLOSE_PCT>"
    }
  }$$,
  'Seed: base posture tokens for MVP engine',
  '52a1b235-0761-4b05-b765-f3df1a324387'
)
ON CONFLICT DO NOTHING;

// supabase/functions/v1-runs-replay/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

// TODO: Verify this import matches your project structure. 
// It might be '../_vendor/engine/index.ts' or similar based on your v1-analyze function.
import { analyze } from "../_vendor/engine/src/index.ts" 

console.log("Hello from v1-runs-replay!")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get Run ID from request
    const { runId } = await req.json()
    if (!runId) throw new Error("Missing runId")

    // 2. Fetch Original Run Data
    const { data: run, error: runError } = await supabaseClient
      .from('runs')
      .select('*')
      .eq('id', runId)
      .single()
    
    if (runError || !run) throw new Error("Run not found or access denied")

    // 3. Fetch Historical Policy
    // If policy_version_id is null, it used the 'active' policy at the time. 
    // Ideally, your v1-runs-save logic snapshotting the policy into the run row 
    // or linking to a specific version. 
    // For replay, we rely on the DB to give us the policy snapshot if available, 
    // or fetch the version row.
    
    let policySnapshot = null;
    
    if (run.policy_version_id) {
        const { data: policyVer } = await supabaseClient
            .from('policy_versions')
            .select('policy_json')
            .eq('id', run.policy_version_id)
            .single()
        policySnapshot = policyVer?.policy_json
    }

    if (!policySnapshot) {
        // Fallback: If your run row stores the snapshot directly (recommended pattern), use that.
        // If not, we can't reliably replay without the policy.
        // We'll check if 'input_json' contains the policy snapshot or if we fail here.
        throw new Error("Cannot replay: Linked policy version not found.")
    }

    // 4. Re-Run Engine
    // inputs: run.input_json
    // policy: policySnapshot
    
    // Normalize inputs if needed (e.g. if stored as { deal: ... })
    const dealInput = run.input_json.deal || run.input_json; 

    const result = analyze(dealInput, policySnapshot);

    // 5. Compare Hashes
    // We import a strictly deterministic hash function or use the engine's internal hasher if available.
    // Ideally, the 'result' object from engine includes the hashes.
    
    const newOutputHash = result.hashes?.outputs || "hash_not_returned_by_engine";
    const originalOutputHash = run.hash_outputs;

    const isMatch = newOutputHash === originalOutputHash;

    // 6. Return Result
    return new Response(
      JSON.stringify({
        match: isMatch,
        original_hash: originalOutputHash,
        replay_hash: newOutputHash,
        diff: isMatch ? null : {
            message: "Drift detected. Logic or dependencies may have changed."
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
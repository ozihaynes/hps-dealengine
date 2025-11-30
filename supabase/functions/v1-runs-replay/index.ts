import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

// CORRECTED IMPORT: Points to the .js file in _vendor/engine
import { analyze } from "../_vendor/engine/index.js"

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

    const { runId } = await req.json()
    if (!runId) throw new Error("Missing runId")

    // 1. Fetch Original Run Data
    const { data: run, error: runError } = await supabaseClient
      .from('runs')
      .select('*')
      .eq('id', runId)
      .single()
    
    if (runError || !run) throw new Error("Run not found or access denied")

    // 2. Fetch Historical Policy
    let policySnapshot = null;
    if (run.policy_version_id) {
        const { data: policyVer } = await supabaseClient
            .from('policy_versions')
            .select('policy_json')
            .eq('id', run.policy_version_id)
            .single()
        policySnapshot = policyVer?.policy_json
    }

    // Fallback: Check if inputs had policy embedded or error out
    if (!policySnapshot) {
         // Some implementations store snapshot in run directly. Check that if needed.
         // For now, strict error.
         throw new Error("Cannot replay: Linked policy version not found.")
    }

    // 3. Re-Run Engine
    const dealInput = run.input_json.deal || run.input_json; 

    // Execute deterministic analysis
    const result = analyze(dealInput, policySnapshot);

    // 4. Compare Hashes
    const newOutputHash = result.hashes?.outputs || "hash_not_returned";
    const originalOutputHash = run.hash_outputs;

    const isMatch = newOutputHash === originalOutputHash;

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

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

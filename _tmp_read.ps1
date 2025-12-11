Set-Location 'C:\Users\oziha\Documents\hps-dealengine'; (Get-Content supabase/functions/v1-ai-bridge/index.ts | Select-String -Pattern 'handleDealNegotiator' -Context 0,40)

import { Agent, AgentInputItem, Runner, webSearchTool, withTrace } from "@openai/agents";

const webSearchPreview = webSearchTool({
  userLocation: {
    type: "approximate",
    country: "US",
    region: undefined,
    city: undefined,
    timezone: undefined,
  },
  searchContextSize: "high",
});

const strategistAgent = new Agent({
  name: "Deal Strategist (smoke test)",
  instructions: [
    "You are the Deal Strategist persona for HPS DealEngine.",
    "Stay concise and actionable; avoid flowery language.",
    "Do not invent or adjust numeric underwriting results; reference only what the user provides.",
    "Call tools only when the user explicitly asks for outside context.",
  ].join(" "),
  model: "gpt-5-chat-latest",
  tools: [webSearchPreview],
  modelSettings: {
    temperature: 0,
    topP: 1,
    maxTokens: 800,
    store: true,
  },
});

type WorkflowInput = { input_as_text: string };

export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("strategist-smoke", async () => {
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] },
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_69378fa6fbd88190884e4b093753a10900dcaccdc6da130e",
        persona: "strategist",
      },
    });

    const result = await runner.run(strategistAgent, [...conversationHistory]);

    if (!result.finalOutput) {
      throw new Error("Agent result is undefined");
    }

    return {
      output_text: result.finalOutput,
      trace: result.trace ?? null,
    };
  });
};

// Allow quick CLI smoke tests via: pnpm dlx tsx tools/agentbuilder/strategist-smoke.ts "prompt"
if (process.argv[1]?.includes("strategist-smoke")) {
  const prompt = process.argv.slice(2).join(" ") || "Explain how you will operate as the strategist.";

  runWorkflow({ input_as_text: prompt })
    .then((result) => {
      console.log("\n--- Strategist output ---\n");
      console.log(result.output_text);
      if (result.trace) {
        console.log("\n(trace attached in result.trace)\n");
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

/**
 * Minimal local shim to satisfy the Gemini UI export in BusinessLogicSandbox.
 * We only provide the methods that the component uses.
 */
export const Type: any = {};

type ChatCreateOpts = {
  model?: string;
  history?: any[];
  config?: Record<string, any>;
};

type ChatSession = {
  sendMessage: (msg: any) => Promise<any>;
  history: any[];
  model: string;
  config: Record<string, any>;
};

export class GoogleGenAI {
  constructor(..._args: any[]) {}

  // Node-style API shape sometimes used by exported UIs
  public chats = {
    create: (opts: ChatCreateOpts = {}): ChatSession => {
      const session: ChatSession = {
        model: opts.model ?? "stub-model",
        history: Array.isArray(opts.history) ? opts.history : [],
        config: opts.config ?? {},
        // Return a generic empty-ish response so the UI can render without runtime errors
        sendMessage: async (_msg: any) => ({
          text: "",
          candidates: [],
          response: {},
        }),
      };
      return session;
    },
  };

  // Also provide a simple "model(...).generateContent()" surface some exports expect
  public model(_args?: any) {
    return {
      generateContent: async (_input: any) => ({ text: "" }),
    } as any;
  }
}

export default GoogleGenAI;

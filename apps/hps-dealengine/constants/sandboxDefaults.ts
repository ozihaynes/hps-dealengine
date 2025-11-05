import * as raw from "./sandboxSettings";
import { policyDefaults } from "@hps-internal/contracts";

// If user-level sandboxSettings exists and has keys, use it.
// Otherwise, fall back to the typed policyDefaults from contracts.
const user = (raw as any)?.default ?? (raw as any);
const sandboxDefaults = (user && typeof user === "object" && Object.keys(user).length > 0
  ? user
  : (policyDefaults as any));

export default sandboxDefaults as any;
import React, { useEffect, useMemo, useState } from "react";
import type {
  Posture,
  RepairRateProfile,
  RepairRates,
} from "@hps-internal/contracts";
import { Postures } from "@hps-internal/contracts";
import {
  createRepairProfile,
  fetchRepairProfiles,
  setActiveRepairProfile,
  updateRepairProfile,
} from "@/lib/repairProfiles";
import { GlassCard, Button, InputField, SelectField } from "../ui";
import { num } from "@/utils/helpers";
import { useDealSession } from "@/lib/dealSessionContext";

type EditState = {
  name: string;
  asOf: string;
  source: string;
  version: string;
  psfTiers: RepairRates["psfTiers"];
  big5: RepairRates["big5"];
  lineItemText: string;
};

const defaultPsf: RepairRates["psfTiers"] = {
  none: 0,
  light: 0,
  medium: 0,
  heavy: 0,
};
const defaultBig5: RepairRates["big5"] = {
  roof: 0,
  hvac: 0,
  repipe: 0,
  electrical: 0,
  foundation: 0,
};

function lineItemsToText(lineItems?: Record<string, unknown>) {
  if (!lineItems || typeof lineItems !== "object") return "";
  return Object.entries(lineItems)
    .map(([k, v]) => `${k}=${v as any}`)
    .join("\n");
}

function textToLineItems(text: string): Record<string, number> {
  const entries = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [k, v] = line.split("=").map((s) => s.trim());
      return [k, num(v, 0)] as const;
    });
  const out: Record<string, number> = {};
  for (const [k, v] of entries) {
    if (!k) continue;
    out[k] = v;
  }
  return out;
}

function profileToEditState(profile: RepairRateProfile): EditState {
  return {
    name: profile.name,
    asOf: profile.asOf,
    source: profile.source ?? "",
    version: profile.version,
    psfTiers: profile.psfTiers ?? defaultPsf,
    big5: profile.big5 ?? defaultBig5,
    lineItemText: lineItemsToText(profile.lineItemRates ?? {}),
  };
}

export const RepairsSandbox: React.FC<{
  posture: Posture;
  onPostureChange: (next: Posture) => void;
  defaultMarket?: string;
}> = ({ posture, onPostureChange, defaultMarket = "ORL" }) => {
  const {
    dbDeal,
    setActiveRepairProfileId,
    refreshRepairRates,
    activeRepairProfileId,
    activeRepairProfile,
  } = useDealSession();
  const [marketCode, setMarketCode] = useState<string>(defaultMarket);
  const [profiles, setProfiles] = useState<RepairRateProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    name: "",
    asOf: "",
    source: "",
    version: "",
    psfTiers: defaultPsf,
    big5: defaultBig5,
    lineItemText: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneName, setCloneName] = useState<string>("");

  const activeProfile = useMemo(
    () => profiles.find((p) => p.isActive) ?? null,
    [profiles],
  );

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? activeProfile ?? null,
    [profiles, selectedId, activeProfile],
  );

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchRepairProfiles({
        dealId: dbDeal?.id,
        marketCode,
        posture,
        includeInactive: true,
      });
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] loadProfiles result", {
          count: list.length,
          marketCode,
          posture,
        });
      }
      setProfiles(list);
      const active = list.find((p) => p.isActive) ?? list[0];
      if (active) {
        setSelectedId(active.id!);
        setEditState(profileToEditState(active));
        if (process.env.NODE_ENV !== "production") {
          console.debug("[RepairsSandbox] loaded profile", {
            profileId: active.id,
            name: active.name,
            orgId: active.orgId,
            marketCode: active.marketCode,
            posture: active.posture,
            big5: active.big5,
          });
        }
      }
    } catch (err: any) {
      console.error("[RepairsSandbox] load error", err);
      setError(err?.message ?? "Failed to load repair profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfiles();
  }, [posture, marketCode, activeRepairProfileId, activeRepairProfile?.id, dbDeal?.org_id]);

  const handleSelectProfile = (id: string) => {
    setSelectedId(id);
    const found = profiles.find((p) => p.id === id);
    if (found) {
      setEditState(profileToEditState(found));
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] selected profile", {
          profileId: found.id,
          name: found.name,
          orgId: found.orgId,
          marketCode: found.marketCode,
          posture: found.posture,
          big5: found.big5,
        });
      }
    }
  };

  const handleSave = async () => {
    if (!selectedProfile?.id) return;
    setSaving(true);
    setError(null);
    try {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] save profile", {
          profileId: selectedProfile.id,
          posture,
          marketCode,
        });
      }
      const payload = {
        id: selectedProfile.id,
        name: editState.name,
        asOf: editState.asOf,
        source: editState.source || null,
        version: editState.version,
        psfTiers: editState.psfTiers,
        big5: editState.big5,
        lineItemRates: textToLineItems(editState.lineItemText),
        dealId: dbDeal?.id,
      };

      const updated = await updateRepairProfile(payload);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] save success", {
          id: updated.id,
          marketCode: updated.marketCode,
          posture: updated.posture,
        });
      }
      setProfiles((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      setEditState(profileToEditState(updated));
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] calling refreshRepairRates after save", {
          profileId: updated.id,
          marketCode: marketCode.toUpperCase(),
          posture,
        });
      }
      try {
        await refreshRepairRates({
          profileId: updated.id,
          marketCode: marketCode.toUpperCase(),
          posture,
        });
      } catch (refreshErr) {
        console.error(
          "[RepairsSandbox] refreshRepairRates error after save",
          refreshErr,
        );
        throw refreshErr;
      }
    } catch (err: any) {
      console.error("[RepairsSandbox] save error", err);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] save error payload", err);
      }
      setError(err?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] set active", {
          profileId: id,
          posture,
          marketCode,
        });
      }
      const updated = await setActiveRepairProfile({
        id,
        isDefault: true,
        dealId: dbDeal?.id,
      });
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] activate success", {
          id: updated.id,
          marketCode,
          posture: updated.posture,
        });
      }
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === updated.id
            ? updated
            : { ...p, isActive: false, isDefault: false },
        ),
      );
      setActiveRepairProfileId(updated.id ?? null);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] calling refreshRepairRates after activate", {
          profileId: updated.id,
          marketCode: marketCode.toUpperCase(),
          posture,
        });
      }
      try {
        await refreshRepairRates({
          profileId: updated.id,
          marketCode: marketCode.toUpperCase(),
          posture,
        });
      } catch (refreshErr) {
        console.error(
          "[RepairsSandbox] refreshRepairRates error after activate",
          refreshErr,
        );
        throw refreshErr;
      }
    } catch (err: any) {
      console.error("[RepairsSandbox] activate error", err);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] activate error payload", err);
      }
      setError(err?.message ?? "Failed to activate profile");
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!selectedProfile) return;
    const name = cloneName.trim() || `${selectedProfile.name} copy`;
    setSaving(true);
    setError(null);
    try {
      const cloned = await createRepairProfile({
        name,
        marketCode,
        posture,
        asOf: selectedProfile.asOf,
        source: selectedProfile.source,
        version: selectedProfile.version,
        psfTiers: selectedProfile.psfTiers,
        big5: selectedProfile.big5,
        lineItemRates: selectedProfile.lineItemRates,
        cloneFromId: selectedProfile.id,
        isActive: false,
        isDefault: false,
        dealId: dbDeal?.id,
      });
      setProfiles((prev) => [cloned, ...prev]);
      setCloneName("");
      if (process.env.NODE_ENV !== "production") {
        console.debug("[RepairsSandbox] clone success", {
          newId: cloned.id,
          fromId: selectedProfile.id,
          marketCode,
          posture,
        });
      }
    } catch (err: any) {
      console.error("[RepairsSandbox] clone error", err);
      setError(err?.message ?? "Failed to clone profile");
    } finally {
      setSaving(false);
    }
  };

  const updatePsf = (key: keyof RepairRates["psfTiers"], value: number) => {
    setEditState((prev) => ({
      ...prev,
      psfTiers: { ...prev.psfTiers, [key]: value },
    }));
  };

  const updateBig5 = (key: keyof RepairRates["big5"], value: number) => {
    setEditState((prev) => ({
      ...prev,
      big5: { ...prev.big5, [key]: value },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label="Posture"
          value={posture}
          onChange={(e: any) => onPostureChange(e.target.value as Posture)}
        >
          {Postures.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </SelectField>
        <InputField
          label="Market code"
          value={marketCode}
          onChange={(e: any) => setMarketCode(e.target.value)}
        />
        <Button size="sm" variant="neutral" onClick={() => void loadProfiles()}>
          Refresh
        </Button>
      </div>

      {error && (
        <GlassCard className="border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-100">
          {error}
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <GlassCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">
              Profiles ({marketCode}) {loading ? "..." : ""}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => void loadProfiles()}>
              Reload
            </Button>
          </div>
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectProfile(p.id!)}
                className={`w-full text-left rounded-lg border px-3 py-2 ${p.id === selectedProfile?.id ? "border-accent-blue bg-accent-blue/10" : "border-border/40 bg-surface/40"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-text-primary">
                    {p.name}
                  </div>
                  {p.isActive && (
                    <span className="text-[11px] text-accent-green">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  v{p.version} | as of {p.asOf} | {p.posture}
                </div>
              </button>
            ))}
            {profiles.length === 0 && !loading && (
              <div className="text-xs text-text-secondary">
                No profiles yet for {marketCode}. Clone or create one.
              </div>
            )}
          </div>
          {selectedProfile?.id && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={saving}
                onClick={() => void handleActivate(selectedProfile.id!)}
              >
                Set Active (org/market/posture)
              </Button>
              <Button
                size="sm"
                variant="neutral"
                disabled={saving}
                onClick={() => {
                  if (process.env.NODE_ENV !== "production") {
                    console.debug("[RepairsSandbox] manual sync to DealSession", {
                      profileId: selectedProfile.id,
                      posture,
                      marketCode,
                    });
                  }
                  void refreshRepairRates({
                    profileId: selectedProfile.id,
                    marketCode,
                    posture,
                  }).catch((err) =>
                    console.error(
                      "[RepairsSandbox] refreshRepairRates error manual sync",
                      err,
                    ),
                  );
                }}
              >
                Sync to DealSession
              </Button>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-4 md:col-span-2 space-y-4">
          {selectedProfile ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    Editing: {selectedProfile.name}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {selectedProfile.marketCode} | posture {selectedProfile.posture} |{" "}
                    {selectedProfile.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
          <Button size="sm" variant="primary" disabled={saving} onClick={() => void handleSave()}>
            Save Changes
          </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InputField
                  label="Profile Name"
                  value={editState.name}
                  onChange={(e: any) =>
                    setEditState((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <InputField
                  label="As of date"
                  type="date"
                  value={editState.asOf}
                  onChange={(e: any) =>
                    setEditState((prev) => ({ ...prev, asOf: e.target.value }))
                  }
                />
                <InputField
                  label="Source"
                  value={editState.source}
                  onChange={(e: any) =>
                    setEditState((prev) => ({ ...prev, source: e.target.value }))
                  }
                />
                <InputField
                  label="Version"
                  value={editState.version}
                  onChange={(e: any) =>
                    setEditState((prev) => ({ ...prev, version: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-text-primary">
                    PSF Tiers
                  </div>
                  {(["none", "light", "medium", "heavy"] as const).map((key) => (
                    <InputField
                      key={key}
                      label={key}
                      type="number"
                      value={(editState.psfTiers as any)?.[key] ?? 0}
                      onChange={(e: any) => updatePsf(key, num(e.target.value, 0))}
                      prefix="$"
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-text-primary">
                    Big 5 ($/sqft)
                  </div>
                  {(["roof", "hvac", "repipe", "electrical", "foundation"] as const).map(
                    (key) => (
                      <InputField
                        key={key}
                        label={key}
                        type="number"
                        value={(editState.big5 as any)?.[key] ?? 0}
                        onChange={(e: any) => updateBig5(key, num(e.target.value, 0))}
                        prefix="$"
                      />
                    ),
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-text-primary mb-1">
                  Line-item rates (key=amount per line)
                </div>
                <textarea
                  className="w-full min-h-[140px] rounded-lg border border-border/50 bg-surface/60 p-3 text-sm"
                  value={editState.lineItemText}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, lineItemText: e.target.value }))
                  }
                  placeholder="kitchen_cabinets=3500&#10;bathroom_full=4500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <InputField
                  label="Clone as"
                  value={cloneName}
                  onChange={(e: any) => setCloneName(e.target.value)}
                  placeholder="e.g., Base - Heavy Rehab"
                />
                <Button size="sm" variant="neutral" disabled={saving} onClick={() => void handleClone()}>
                  Clone Profile
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-text-secondary">
              Select a profile to edit rates.
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default RepairsSandbox;

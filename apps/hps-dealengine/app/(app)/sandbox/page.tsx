"use client";

import { useEffect, useState } from "react";
import type {
  SandboxPreset,
  SandboxSettings,
} from "@hps-internal/contracts";
import { Postures } from "@hps-internal/contracts";

import BusinessLogicSandbox from "@/components/sandbox/BusinessLogicSandbox";
import { DEFAULT_SANDBOX_CONFIG, mergeSandboxConfig } from "@/constants/sandboxSettings";
import { GlassCard } from "@/components/ui";
import RepairsSandbox from "@/components/sandbox/RepairsSandbox";
import {
  fetchSandboxSettings,
  upsertSandboxSettings,
} from "@/lib/sandboxSettings";
import {
  createSandboxPreset,
  deleteSandboxPreset,
  fetchSandboxPresets,
} from "@/lib/sandboxPresets";
import { prepareSandboxConfigForSave } from "@/constants/sandboxSettings";
import { useDealSession } from "@/lib/dealSessionContext";

type SandboxConfigValues = SandboxSettings["config"];

export default function SandboxSettingsPage() {
  const { dbDeal, membershipRole } = useDealSession();
  const [posture, setPosture] = useState<(typeof Postures)[number]>("base");
  const [config, setConfig] = useState<SandboxConfigValues>(DEFAULT_SANDBOX_CONFIG);
  const [presets, setPresets] = useState<
    Awaited<ReturnType<typeof fetchSandboxPresets>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"business" | "repairs">(
    "business",
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const settings = await fetchSandboxSettings({ posture });
        if (!mounted) return;
        const merged = mergeSandboxConfig(settings?.config);
        setConfig(merged);
      } catch (err) {
        console.error("[/sandbox] failed to load settings", err);
        if (mounted) {
          setConfig(DEFAULT_SANDBOX_CONFIG);
          setError("Could not load sandbox settings. Showing defaults.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    loadPresets();
    return () => {
      mounted = false;
    };
  }, [posture]);

  const loadPresets = async () => {
    setPresetsLoading(true);
    try {
      const list = await fetchSandboxPresets({ posture });
      setPresets(list);
    } catch (err) {
      console.error("[/sandbox] failed to load presets", err);
    } finally {
      setPresetsLoading(false);
    }
  };

  const handleSave = async (nextConfig: SandboxConfigValues) => {
    setSaving(true);
    setError(null);
    try {
      const payload = prepareSandboxConfigForSave(nextConfig as any);
      const saved = await upsertSandboxSettings({
        posture,
        config: payload,
      });
      setConfig(mergeSandboxConfig(saved.config));
    } catch (err) {
      console.error("[/sandbox] failed to save settings", err);
      setError("Could not save sandbox settings. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreset = async (nextConfig: SandboxConfigValues, name: string) => {
    const normalized = prepareSandboxConfigForSave(mergeSandboxConfig(nextConfig));
    const saved = await createSandboxPreset({
      name,
      posture,
      settings: normalized,
    });
    setPresets((prev) => [saved, ...prev]);
  };

  const handleLoadPreset = (preset: SandboxPreset) => {
    setConfig(mergeSandboxConfig(preset.settings));
  };

  const handleDeletePreset = (id: SandboxPreset["id"]) => {
    void (async () => {
      await deleteSandboxPreset(id);
      setPresets((prev) => prev.filter((p) => p.id !== id));
    })();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-2 rounded-lg text-sm ${activeTab === "business" ? "bg-accent-blue text-white" : "bg-surface/60 text-text-secondary"}`}
          onClick={() => setActiveTab("business")}
        >
          Business Logic Sandbox
        </button>
        <button
          className={`px-3 py-2 rounded-lg text-sm ${activeTab === "repairs" ? "bg-accent-blue text-white" : "bg-surface/60 text-text-secondary"}`}
          onClick={() => setActiveTab("repairs")}
        >
          Repairs Sandbox
        </button>
      </div>

      {error && (
        <GlassCard className="border border-accent-orange/40 bg-accent-orange/5 p-4 text-sm text-accent-orange">
          {error}
        </GlassCard>
      )}
      {loading && activeTab === "business" ? (
        <GlassCard className="border border-white/5 bg-surface-elevated/60 p-5 text-sm text-text-secondary">
          Loading sandbox...
        </GlassCard>
      ) : activeTab === "business" ? (
        <BusinessLogicSandbox
          posture={posture}
          role={membershipRole}
          dealId={dbDeal?.id ?? null}
          config={config}
          presets={presets}
          presetsLoading={presetsLoading}
          isSaving={saving}
          onSave={handleSave}
          onSavePreset={handleSavePreset}
          onLoadPreset={handleLoadPreset}
          onDeletePreset={handleDeletePreset}
          onPostureChange={setPosture}
        />
      ) : (
        <RepairsSandbox
          posture={posture}
          onPostureChange={setPosture}
          defaultMarket="ORL"
        />
      )}
    </div>
  );
}

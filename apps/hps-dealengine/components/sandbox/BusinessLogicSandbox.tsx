"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SandboxPreset,
  SandboxSettings,
  SandboxSettingKey,
} from "@hps-internal/contracts";
import { Postures } from "@hps-internal/contracts";

import {
  Button,
  DynamicBandEditor,
  Icon,
  InputField,
  MultiSelectChecklist,
  SelectField,
  ToggleSwitch,
} from "@/components/ui";
import { Icons } from "@/constants";
import {
  SANDBOX_PAGES_CONFIG,
  SANDBOX_SETTING_META_BY_KEY,
  isPostureAwareKey,
} from "@/constants/sandboxSettings";
import {
  SANDBOX_V1_KNOBS,
  sandboxKnobMap,
} from "@/constants/sandboxKnobs";
import { canEditGoverned } from "@/constants/governedTokens";
import {
  getKnobMetadata,
  isKeepKnob,
} from "@/lib/sandboxKnobAudit";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";
import {
  askSandboxStrategist,
  buildStrategistPayload,
} from "@/lib/sandboxStrategist";
import RequestOverrideModal from "../underwrite/RequestOverrideModal";
import { fmt$ } from "@/utils/helpers";

type SandboxConfigValues = SandboxSettings["config"];

type BusinessLogicSandboxProps = {
  posture: (typeof Postures)[number];
  role?: string | null;
  dealId?: string | null;
  config: SandboxConfigValues;
  presets: SandboxPreset[];
  presetsLoading?: boolean;
  isSaving?: boolean;
  onSave: (config: SandboxConfigValues) => Promise<void> | void;
  onSavePreset?: (
    config: SandboxConfigValues,
    name: string,
  ) => Promise<void> | void;
  onLoadPreset?: (preset: SandboxPreset) => void;
  onDeletePreset?: (id: SandboxPreset["id"]) => void;
  onPostureChange?: (posture: (typeof Postures)[number]) => void;
};

const componentMap: Record<string, React.ComponentType<any>> = {
  InputField,
  SelectField,
  ToggleSwitch,
  MultiSelectChecklist,
  DynamicBandEditor,
  Textarea: (props: any) => {
    const { label, description, ...rest } = props;
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          {label}
        </label>
        {description && (
          <p className="mb-2 text-xs text-text-secondary/70">
            {description}
          </p>
        )}
        <textarea {...rest} className="dark-input h-24 w-full font-mono text-xs" />
      </div>
    );
  },
};

type ChatMessage = { role: "user" | "model"; content: string };

const StrategistChat = ({
  settings,
  posture,
}: {
  settings: SandboxConfigValues;
  posture: (typeof Postures)[number];
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content:
        "Welcome to the DealEngine Strategist. Ask about any sandbox setting and we'll explain what it does and how it affects underwriting.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toHtml = (markdown: string) =>
    markdown
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br />");

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    const userText = input.trim();
    const nextMessages = [...messages, { role: "user" as const, content: userText }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const payload = buildStrategistPayload(userText, posture, settings as any);
      const response = await askSandboxStrategist({
        ...payload,
        threadId,
      });

      if (response.ok) {
        if (response.threadId) {
          setThreadId(response.threadId);
        }
        const aiMessage = {
          role: "model" as const,
          content: toHtml(response.markdown),
        };
        setMessages([...nextMessages, aiMessage]);
        return;
      }

      const nextThreadId = response.threadId ?? threadId ?? null;
      if (nextThreadId !== threadId) {
        setThreadId(nextThreadId);
      }
      setError(
        response.error ??
          "Strategist is unavailable right now. Please try again.",
      );
      setMessages([
        ...nextMessages,
        {
          role: "model" as const,
          content:
            '<p class="text-accent-orange">Sorry, I hit an error. Please try again shortly.</p>',
        },
      ]);
    } catch (err) {
      console.error("[Sandbox Strategist] failed", err);
      setError("Strategist is unavailable right now. Please try again.");
      setMessages([
        ...nextMessages,
        {
          role: "model" as const,
          content:
            '<p class="text-accent-orange">Sorry, I hit an error. Please try again shortly.</p>',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg-main">
      <div className="flex-shrink-0 p-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-text-primary">
          <Icon d={Icons.playbook} size={18} className="text-accent-blue" />
          DealEngine Strategist
        </h3>
      </div>
      <div className="flex-grow space-y-4 overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-accent-blue text-white"
                  : "info-card"
              }`}
            >
              <div
                className="prose prose-invert max-w-none text-text-secondary/90"
                dangerouslySetInnerHTML={{
                  __html: msg.content.replace(/\n/g, "<br />"),
                }}
              />
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="info-card max-w-[85%] animate-pulse rounded-lg px-3 py-2 text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="flex-shrink-0 p-4">
        {error && (
          <div className="mb-2 text-xs text-accent-orange">{error}</div>
        )}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
              const target = e.currentTarget;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
            placeholder="Ask about a setting or policy..."
            className="dark-input w-full resize-none overflow-y-hidden pr-12"
            rows={2}
            style={{ maxHeight: "8rem" }}
            disabled={isSending}
            aria-label="Chat input"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !input.trim()}
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center p-0"
            size="sm"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
};

const FloatingStrategistChat = ({
  settings,
  posture,
}: {
  settings: SandboxConfigValues;
  posture: (typeof Postures)[number];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  const panelStart = useRef({ top: 0, left: 0 });

  const clampPosition = useCallback((top: number, left: number) => {
    const margin = 12;
    const rect = panelRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 380;
    const height = rect?.height ?? 520;
    const maxLeft =
      typeof window !== "undefined"
        ? Math.max(margin, window.innerWidth - width - margin)
        : margin;
    const maxTop =
      typeof window !== "undefined"
        ? Math.max(margin, window.innerHeight - height - margin)
        : margin;

    return {
      top: Math.min(Math.max(margin, top), maxTop),
      left: Math.min(Math.max(margin, left), maxLeft),
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(typeof window !== "undefined" ? window.innerWidth < 768 : false);
      setPanelPosition((prev) => {
        const margin = 16;
        const rect = panelRef.current?.getBoundingClientRect();
        const width = rect?.width ?? 380;
        const height = rect?.height ?? 520;
        const defaultLeft =
          typeof window !== "undefined"
            ? Math.max(margin, window.innerWidth - width - margin)
            : margin;
        const defaultTop =
          typeof window !== "undefined"
            ? Math.max(margin, window.innerHeight - height - margin - 48)
            : margin;

        if (!prev) {
          return { top: defaultTop, left: defaultLeft };
        }
        return clampPosition(prev.top, prev.left);
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      const deltaX = e.clientX - pointerStart.current.x;
      const deltaY = e.clientY - pointerStart.current.y;
      const base = panelStart.current;
      const next = clampPosition(base.top + deltaY, base.left + deltaX);
      setPanelPosition(next);
    };

    const stop = () => setIsDragging(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [clampPosition, isDragging]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) return;
    setIsDragging(true);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    const fallback = panelPosition ?? { top: 120, left: 120 };
    panelStart.current = fallback;
    setPanelPosition(fallback);
  };

  const currentPosition = panelPosition ?? { top: 120, left: 120 };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-accent-blue via-indigo-500 to-sky-500 shadow-lg shadow-blue-900/40 ring-2 ring-white/10 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent-blue/60 sm:bottom-10 md:bottom-6 md:right-6 animate-pulse"
          aria-label="Open Strategist chat"
        >
          <div className="flex h-full w-full items-center justify-center text-white drop-shadow">
            <Icon d={Icons.playbook} size={22} />
          </div>
        </button>
      )}

      {isOpen && (
        <div
          ref={panelRef}
          className={`fixed z-50 flex max-h-[82vh] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated/90 shadow-2xl shadow-black/40 backdrop-blur md:w-[420px] ${
            isMobile ? "inset-x-2 bottom-2 top-20 w-auto max-w-none" : "w-[min(90vw,420px)]"
          }`}
          style={
            isMobile
              ? undefined
              : {
                  top: currentPosition.top,
                  left: currentPosition.left,
                }
          }
        >
          <div
            className={`flex items-center justify-between gap-3 bg-white/5 px-4 py-3 text-sm font-semibold text-text-primary ${
              isMobile ? "cursor-default" : "cursor-grab active:cursor-grabbing"
            }`}
            onPointerDown={handlePointerDown}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-10 rounded-full bg-white/30" aria-hidden />
              <span>DealEngine Strategist</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-text-secondary hover:text-text-primary"
              onClick={() => setIsOpen(false)}
              aria-label="Minimize Strategist chat"
            >
              -
            </Button>
          </div>
          <div className="flex h-full flex-col overflow-hidden">
            <StrategistChat settings={settings} posture={posture} />
          </div>
        </div>
      )}
    </>
  );
};

const BusinessLogicSandbox: React.FC<BusinessLogicSandboxProps> = ({
  posture,
  role,
  dealId,
  config,
  presets,
  isSaving,
  onSave,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onPostureChange,
  presetsLoading,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [settings, setSettings] = useState<SandboxConfigValues>(config);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPresetActions, setShowPresetActions] = useState<
    SandboxPreset["id"] | null
  >(null);
  const [status, setStatus] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);
  const [showLegacyKnobs, setShowLegacyKnobs] = useState(false);
  const [overrideToken, setOverrideToken] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<any>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const knobMetaMap = useMemo(() => sandboxKnobMap(), []);
  const canEditGovernedFields = useMemo(
    () => canEditGoverned(role),
    [role],
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    setSettings(config);
    setHasUnsavedChanges(false);
  }, [config]);

  const filteredPages = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const pages = SANDBOX_PAGES_CONFIG.map((page) => {
      const filteredSettings = page.settings.filter((setting) => {
        const key = setting.key as SandboxSettingKey;
        const keep = isKeepKnob(key);
        if (!showLegacyKnobs && !keep) {
          return false;
        }
        if (!lowerCaseQuery) {
          return true;
        }
        return (
          setting.label.toLowerCase().includes(lowerCaseQuery) ||
          setting.description.toLowerCase().includes(lowerCaseQuery)
        );
      });
      return { ...page, settings: filteredSettings };
    }).filter((page) => {
      const matchesPageQuery = lowerCaseQuery
        ? page.title.toLowerCase().includes(lowerCaseQuery) ||
          page.description.toLowerCase().includes(lowerCaseQuery)
        : true;
      if (showLegacyKnobs) {
        return matchesPageQuery || page.settings.length > 0;
      }
      return page.settings.length > 0 && matchesPageQuery;
    });

    return pages;
  }, [searchQuery, showLegacyKnobs]);

  const pageConfig = useMemo(
    () => filteredPages[currentPage] || filteredPages[0],
    [currentPage, filteredPages],
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, showLegacyKnobs]);

  const getSettingValue = (key: string) => {
    if (isPostureAwareKey(key)) {
      return (settings as any)?.postureConfigs?.[posture]?.[key] ?? (settings as any)?.[key];
    }
    return (settings as any)?.[key];
  };

  const handleSettingChange = (key: string, value: any) => {
    if (isPostureAwareKey(key)) {
      setSettings((prev) => {
        const next = { ...(prev ?? {}) } as any;
        const postureConfigs = { ...(next.postureConfigs ?? {}) };
        postureConfigs[posture] = { ...(postureConfigs[posture] ?? {}) };
        postureConfigs[posture][key] = value;
        next.postureConfigs = postureConfigs;
        if (posture === "base") {
          next[key] = value;
        }
        return next;
      });
    } else {
      setSettings((prev) => ({ ...(prev ?? {}), [key]: value }));
    }
    setStatus(null);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setLocalSaving(true);
    setStatus(null);
    try {
      await onSave(settings);
      setStatus("Sandbox settings saved.");
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error(err);
      setStatus("Could not save sandbox settings. Please try again.");
    } finally {
      setLocalSaving(false);
    }
  };

  const handleSaveAsPreset = async () => {
    if (!onSavePreset) {
      return;
    }
    const name = prompt(
      "Enter a name for this preset (e.g., 'Q4 2025 Aggressive Policy'):",
    );
    if (!name) return;
    setLocalSaving(true);
    setStatus(null);
    try {
      await onSavePreset(settings, name);
      setStatus(`Preset "${name}" saved.`);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error(err);
      setStatus("Could not save preset. Please try again.");
    } finally {
      setLocalSaving(false);
    }
  };

  const handleLoadPreset = (preset: SandboxPreset) => {
    if (
      !window.confirm(
        `Load the "${preset.name}" preset? Unsaved changes will be lost.`,
      )
    ) {
      return;
    }
    setSettings(preset.settings);
    onLoadPreset?.(preset);
    setStatus(`Preset "${preset.name}" loaded.`);
    setHasUnsavedChanges(true);
  };

  const effectiveSaving = isSaving || localSaving;
  const roundingModeValue = getSettingValue("bankersRoundingModeNumericSafety") ?? "bankers";
  const dualScenarioValue =
    getSettingValue("buyerCostsAllocationDualScenarioRenderingWhenUnknown") ?? null;
  const lineItemMethodValue = getSettingValue("buyerCostsLineItemModelingMethod") ?? null;
  const sampleOffer = 214937.5;
  const applyRounding = (mode: string, n: number) => {
    const normalized = (mode || "").toString().toLowerCase();
    if (normalized === "truncate") return Math.trunc(n);
    if (normalized === "round") return Math.round(n);
    // default banker’s: round to nearest even
    const floored = Math.floor(n);
    const fraction = n - floored;
    if (fraction > 0.5) return Math.ceil(n);
    if (fraction < 0.5) return floored;
    return floored % 2 === 0 ? floored : floored + 1;
  };
  const sampleRounded = applyRounding(String(roundingModeValue ?? "bankers"), sampleOffer);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-elevated/40 shadow-lg shadow-blue-900/20">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-white/5 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
            <Icon d={Icons.lightbulb} size={22} className="text-accent-orange" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              Business Logic Sandbox
            </h2>
            <p className="text-sm text-text-secondary">
              DealEngine Configuration Orchestrator
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SelectField
            label="Posture"
            value={posture}
            onChange={(e) =>
              onPostureChange?.(e.target.value as (typeof Postures)[number])
            }
            className="w-48"
            helpKey="sandbox_posture"
          >
            {Postures.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </SelectField>
          <Button
            onClick={handleSaveAsPreset}
            variant="ghost"
            size="sm"
            disabled={effectiveSaving}
          >
            Save as Preset...
          </Button>
          <ToggleSwitch
            label="Show legacy/backlog knobs (unsafe / v2 backlog)"
            checked={showLegacyKnobs}
            onChange={() => setShowLegacyKnobs((prev) => !prev)}
          />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row">
        {/* Left Side (content + sidebar) */}
        <div className="flex flex-grow flex-col">
          <div className="flex flex-grow flex-col xl:flex-row">
            {/* Sidebar */}
            <aside className="w-full flex-shrink-0 border-b border-white/5 p-4 xl:w-64 xl:border-b-0 xl:border-r">
              <InputField
                label=""
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />
              <nav
                className="flex max-h-[520px] flex-col gap-1 overflow-y-auto"
                aria-label="Sandbox sections"
              >
                {filteredPages.map((page, index) => (
                  <button
                    key={page.title}
                    onClick={() => setCurrentPage(index)}
                    className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                      pageConfig?.title === page.title
                        ? "bg-accent-blue text-white"
                        : "text-text-secondary hover:bg-accent-blue/10 hover:text-text-primary"
                    }`}
                    aria-current={
                      pageConfig?.title === page.title ? "page" : undefined
                    }
                  >
                    <span className="flex items-center gap-2">
                      {page.icon && <Icon d={Icons[page.icon]} size={16} />}
                      {page.title}
                    </span>
                    <span className="text-[11px] text-text-secondary/80 group-hover:text-white">
                      {page.settings.length}
                    </span>
                  </button>
                ))}
              </nav>
              <div className="mt-6 space-y-2 border-t border-white/5 pt-4">
                <div className="flex items-center gap-2">
                  <span className="label-xs uppercase">Presets</span>
                </div>
                  <div className="space-y-1">
                  {presets.map((p) => (
                    <div
                      key={p.id}
                      className="group relative flex items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-text-secondary hover:bg-accent-blue/10 hover:text-text-primary"
                      onClick={() => handleLoadPreset(p)}
                      onMouseEnter={() => setShowPresetActions(p.id)}
                      onMouseLeave={() => setShowPresetActions(null)}
                    >
                      <span>{p.name}</span>
                      {showPresetActions === p.id && onDeletePreset && (
                        <Button
                          size="sm"
                          variant="danger"
                          className="h-5 px-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePreset?.(p.id);
                          }}
                          aria-label={`Delete preset ${p.name}`}
                        >
                          &times;
                        </Button>
                      )}
                    </div>
                    ))}
                  {presetsLoading ? (
                    <p className="px-3 text-xs text-text-secondary/60">
                      Loading presets...
                    </p>
                  ) : (
                    presets.length === 0 && (
                      <p className="px-3 text-xs text-text-secondary/60">
                        No presets saved.
                      </p>
                    )
                  )}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow overflow-y-auto p-6" tabIndex={0}>
              {pageConfig ? (
                <>
                  <div className="mb-6 flex flex-col gap-1">
                    <h3 className="text-xl font-bold text-text-primary">
                      {pageConfig.title}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {pageConfig.description}
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {pageConfig.settings.map((setting) => {
                      const meta = SANDBOX_SETTING_META_BY_KEY[setting.key];
                      const postureAware =
                        meta?.postureAware ?? isPostureAwareKey(setting.key);
                      const fixed =
                        meta?.fixedOrVariable === "fixed" || meta?.readOnly;
                      const v1Knob = knobMetaMap[setting.key];
                      const governed = Boolean(
                        v1Knob?.governedToken || false,
                      );
                      const knobMetadata = getKnobMetadata(
                        setting.key as SandboxSettingKey,
                      );
                      const keepKnob =
                        knobMetadata?.recommendedAction === "KEEP";
                      const knobLabel = v1Knob
                        ? `${v1Knob.group} - ${v1Knob.label}`
                        : setting.label;
                      const Component = componentMap[setting.component];
                      if (!Component)
                        return (
                          <div key={setting.key}>
                            Unknown component: {setting.component}
                          </div>
                        );

                      const value = getSettingValue(setting.key);
                      const commonProps = {
                        key: setting.key,
                        label: postureAware
                          ? `${setting.label} · Posture-specific`
                          : setting.label,
                        description: meta?.helpText
                          ? postureAware
                            ? `${meta.helpText} (Posture-specific)`
                            : meta.helpText
                          : postureAware
                            ? `${setting.description} (Posture-specific)`
                            : setting.description,
                        disabled:
                          fixed ||
                          Boolean(setting.props?.disabled) ||
                          setting.props?.disabled === true ||
                          (governed && !canEditGovernedFields),
                        ...(setting.props ?? {}),
                      };
                      const options = setting.props?.options as any;

                      const renderComponent = () => {
                        if (setting.component === "ToggleSwitch") {
                          return (
                            <Component
                              {...commonProps}
                              checked={!!value}
                              onChange={() =>
                                handleSettingChange(setting.key, !value)
                              }
                            />
                          );
                        }
                        if (setting.component === "MultiSelectChecklist") {
                          return (
                            <Component
                              {...commonProps}
                              selected={value || []}
                              onChange={(val: string[]) =>
                                handleSettingChange(setting.key, val)
                              }
                            />
                          );
                        }
                        if (setting.component === "DynamicBandEditor") {
                          return (
                            <Component
                              {...commonProps}
                              data={value || []}
                              onChange={(val: any[]) =>
                                handleSettingChange(setting.key, val)
                              }
                            />
                          );
                        }
                        if (setting.component === "SelectField") {
                          return (
                            <Component
                              {...commonProps}
                              value={value ?? ""}
                              onChange={(e: any) =>
                                handleSettingChange(setting.key, e.target.value)
                              }
                            >
                              {options?.map((opt: string) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </Component>
                          );
                        }
                        return (
                          <Component
                            {...commonProps}
                            value={value ?? ""}
                            onChange={(e: any) =>
                              handleSettingChange(
                                setting.key,
                                e?.target ? e.target.value : e,
                              )
                            }
                          />
                        );
                      };

                      return (
                        <div key={setting.key} className="min-w-0 space-y-1">
                          {renderComponent()}
                          <div className="text-[11px] text-text-secondary">
                            {knobLabel}
                            {governed && !canEditGovernedFields
                              ? " - governed (request override)"
                              : governed
                              ? " - governed"
                              : ""}
                            {!keepKnob && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-accent-orange/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-orange">
                                Legacy/backlog
                              </span>
                            )}
                          </div>
                          {governed && !canEditGovernedFields && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setOverrideToken(
                                  v1Knob?.governedToken ?? setting.key,
                                );
                                setOverrideValue(value);
                                setIsOverrideModalOpen(true);
                              }}
                            >
                              Request Override
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-text-secondary">No settings match your search.</p>
                </div>
              )}
            </main>
          </div>

          <div className="border-t border-white/5 bg-white/5 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">UX &amp; Presentation</h3>
              <span className="text-[11px] text-text-secondary">UX-only knobs (display, not math)</span>
            </div>
            <p className="text-sm text-text-secondary">
              These knobs change how offers and buyer costs are presented. They do not alter core math.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-white/5 bg-surface-elevated/60 p-3">
                <p className="label-xs uppercase text-text-secondary">Rounding mode</p>
                <p className="text-sm font-semibold text-text-primary">
                  {String(roundingModeValue ?? "bankers")}
                </p>
                <p className="text-[11px] text-text-secondary">
                  Example $214,937.50 → <span className="font-mono text-text-primary">{fmt$(sampleRounded, 0)}</span>
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-surface-elevated/60 p-3">
                <p className="label-xs uppercase text-text-secondary">Buyer costs scenario</p>
                <p className="text-sm font-semibold text-text-primary">
                  {dualScenarioValue === true
                    ? "Dual scenario"
                    : dualScenarioValue === false
                    ? "Single scenario"
                    : "Auto"}
                </p>
                <p className="text-[11px] text-text-secondary">
                  When costs are unknown, choose whether to show both conservative and optimistic views.
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-surface-elevated/60 p-3">
                <p className="label-xs uppercase text-text-secondary">Buyer costs detail</p>
                <p className="text-sm font-semibold text-text-primary">
                  {lineItemMethodValue ?? "aggregate"}
                </p>
                <p className="text-[11px] text-text-secondary">
                  Toggle line-item vs aggregate buyer cost display in overview/trace surfaces.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 border-t border-white/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-text-secondary">
              Page {Math.min(currentPage + 1, filteredPages.length || 1)} of{" "}
              {filteredPages.length || 1}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="neutral"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <Button
                variant="neutral"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(p + 1, (filteredPages.length || 1) - 1),
                  )
                }
                disabled={currentPage >= (filteredPages.length || 1) - 1}
              >
                Next
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={effectiveSaving}
              >
                {effectiveSaving ? "Saving..." : "Save & Close Sandbox"}
              </Button>
            </div>
          </div>
          {status && (
            <div className="border-t border-white/5 px-5 pb-4 text-sm text-text-secondary">
              {status}
            </div>
          )}
        </div>
      </div>
      <RequestOverrideModal
        open={isOverrideModalOpen}
        posture={posture}
        dealId={dealId ?? null}
        lastRunId={null}
        defaultTokenKey={overrideToken ?? undefined}
        defaultNewValue={overrideValue}
        defaultOldValue={overrideValue}
        onClose={() => setIsOverrideModalOpen(false)}
        onRequested={() => {
          setStatus("Override request submitted.");
          setIsOverrideModalOpen(false);
        }}
      />
    </div>
  );
};

export default BusinessLogicSandbox;

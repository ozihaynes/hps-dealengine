"use client";

import React, { useEffect, useState } from 'react';
import { GlassCard, Button, Icon, Modal } from '../ui';
import { Icons } from '../../constants';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useDealSession, type DbDeal } from "@/lib/dealSessionContext";
import {
    createDealWithClientInfo,
    createEmptyDealForm,
    fetchDealsForOrg,
    resolveOrgId,
    validateNewDealForm,
} from "@/lib/deals";
import NewDealForm from "../deals/NewDealForm";
import DealsTable from "../deals/DealsTable";

interface StartupPageProps {
    onEnter?: () => void;
}

type StartupDealRow = DbDeal;

const StartupPage: React.FC<StartupPageProps> = ({ onEnter }) => {
    const router = useRouter();
    const { setDbDeal, setDeal } = useDealSession();

    const [step, setStep] = useState(0);
    // New Deal Modal State
    const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
    const [newDeal, setNewDeal] = useState(createEmptyDealForm());
    const [createError, setCreateError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    
    const [deals, setDeals] = useState<StartupDealRow[]>([]);
    const [dealsLoading, setDealsLoading] = useState(true);
    const [dealsError, setDealsError] = useState<string | null>(null);
    const [orgId, setOrgId] = useState<string | null>(null);

    useEffect(() => {
        const timers = [
            setTimeout(() => setStep(1), 300),
            setTimeout(() => setStep(2), 800),
            setTimeout(() => setStep(3), 1400),
            setTimeout(() => setStep(4), 1800),
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadDeals = async () => {
            setDealsLoading(true);
            setDealsError(null);

            try {
                const supabase = getSupabaseClient();

                const callerOrgId = await resolveOrgId(supabase);
                if (!isMounted) return;
                setOrgId(callerOrgId);

                const rows = await fetchDealsForOrg(supabase, callerOrgId);
                if (!isMounted) return;
                setDeals(rows);
            } catch (err) {
                console.error("[startup] load deals error", err);
                if (!isMounted) return;
                setDealsError("Unable to load deals for your org.");
            } finally {
                if (isMounted) {
                    setDealsLoading(false);
                }
            }
        };

        void loadDeals();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleRunNewDeal = async () => {
        setCreateError(null);
        const validationError = validateNewDealForm(newDeal);
        if (validationError) {
            setCreateError(validationError);
            return;
        }

        setCreating(true);
        const supabase = getSupabaseClient();

        try {
            const callerOrgId = orgId ?? (await resolveOrgId(supabase));
            if (!orgId) {
                setOrgId(callerOrgId);
            }

            const inserted = await createDealWithClientInfo({
                supabase,
                orgId: callerOrgId,
                clientName: newDeal.clientName,
                clientPhone: newDeal.clientPhone,
                clientEmail: newDeal.clientEmail,
                propertyStreet: newDeal.propertyStreet,
                propertyCity: newDeal.propertyCity,
                propertyState: newDeal.propertyState,
                propertyPostalCode: newDeal.propertyPostalCode,
            });

            setDeals((prev) => [inserted, ...prev]);
            setDbDeal(inserted);
            if (inserted.payload) {
                try {
                    setDeal(inserted.payload as any);
                } catch {
                    // tolerate malformed payload; user can re-run analyze
                }
            }

            if (process.env.NODE_ENV !== "production") {
                console.log("[startup] created deal", { dealId: inserted.id });
            }

            setIsNewDealModalOpen(false);
            setNewDeal(createEmptyDealForm());

            if (onEnter) {
                onEnter();
            }

            router.push(`/underwrite?dealId=${inserted.id}`);
            router.refresh();
        } catch (err: any) {
            console.error("[startup] create deal error", err);
            setCreateError(err?.message ?? "Unable to create deal. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    const handleSelectDeal = (deal: StartupDealRow) => {
        setDbDeal(deal);
        if (deal.payload) {
            try {
                setDeal(deal.payload as any);
            } catch {
                // ignore malformed payload; user can re-run analyze
            }
        }

        if (onEnter) {
            onEnter();
        }

        router.push(`/overview?dealId=${deal.id}`);
        router.refresh();
    };

    return (
        <div className="w-full max-w-5xl animate-fade-in flex flex-col items-center">
            <GlassCard className="w-full p-8 md:p-10 relative overflow-hidden border-t border-accent-green/30">
                {/* Background decorative glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-accent-green/10 blur-[80px] rounded-full pointer-events-none"></div>

                {/* Hero Section */}
                <div className="text-center mb-10">
                    <div className={`transition-all duration-700 transform ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-green/10 border border-accent-green/20 mb-4">
                            <Icon d={Icons.check} size={32} className="text-accent-green drop-shadow-[0_0_8px_rgba(0,191,99,0.5)]" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">Welcome Back</h1>
                        <p className="text-text-secondary text-base md:text-lg">System Online. Market Data Synced.</p>
                    </div>

                    <div className={`mt-8 max-w-md mx-auto transition-all duration-700 delay-300 transform ${step >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                        <Button 
                            onClick={() => {
                                setCreateError(null);
                                setNewDeal(createEmptyDealForm());
                                setIsNewDealModalOpen(true);
                            }} 
                            variant="primary" 
                            className="w-full py-4 text-lg font-bold shadow-[0_0_20px_-5px_var(--accent-blue)] hover:shadow-[0_0_30px_-5px_var(--accent-blue)] transition-all duration-300 flex items-center justify-center gap-3"
                        >
                            <Icon d={Icons.calculator} size={24} />
                            Run New Deal
                        </Button>
                    </div>
                </div>

                {/* Recent Deals Dashboard */}
                <div className={`border-t border-white/10 pt-8 transition-all duration-700 delay-500 transform ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <DealsTable
                      deals={deals}
                      loading={dealsLoading}
                      error={dealsError}
                      onRetry={() => {
                        setDealsError(null);
                        setDealsLoading(true);
                        const reload = async () => {
                          try {
                            const supabase = getSupabaseClient();
                            const callerOrgId = orgId ?? (await resolveOrgId(supabase));
                            const rows = await fetchDealsForOrg(supabase, callerOrgId);
                            setOrgId(callerOrgId);
                            setDeals(rows);
                          } catch (err) {
                            console.error("[startup] retry load deals error", err);
                            setDealsError("Unable to load deals for your org.");
                          } finally {
                            setDealsLoading(false);
                          }
                        };
                        void reload();
                      }}
                      onRowClick={handleSelectDeal}
                      actionsSlot={
                        <Button
                          variant="neutral"
                          className="whitespace-nowrap"
                          onClick={() => router.push("/deals")}
                        >
                          View all deals
                        </Button>
                      }
                      emptyCta={
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <Button variant="primary" onClick={() => setIsNewDealModalOpen(true)}>
                            Create new deal
                          </Button>
                          <Button variant="neutral" onClick={() => router.push("/deals")}>
                            View all deals
                          </Button>
                        </div>
                      }
                    />
                </div>
            </GlassCard>

            <Modal
                isOpen={isNewDealModalOpen}
                onClose={() => {
                    setIsNewDealModalOpen(false);
                    setCreateError(null);
                    setNewDeal(createEmptyDealForm());
                }}
                title="Start New Deal"
            >
                <div className="p-1">
                    <NewDealForm
                        values={newDeal}
                        onChange={(next) => {
                            setCreateError(null);
                            setNewDeal(next);
                        }}
                        onSubmit={handleRunNewDeal}
                        submitting={creating}
                        error={createError}
                        submitLabel="Start Deal"
                        onCancel={() => {
                            setIsNewDealModalOpen(false);
                            setCreateError(null);
                            setNewDeal(createEmptyDealForm());
                        }}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default StartupPage;

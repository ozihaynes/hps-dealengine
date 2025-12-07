"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { GlassCard, Button, Icon, Modal } from '../ui';
import { Icons } from '../../constants';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useDealSession, type DbDeal } from "@/lib/dealSessionContext";
import {
    createDealWithClientInfo,
    createEmptyDealForm,
    fetchDealsForOrg,
    formatAddressLine,
    resolveOrgId,
    validateNewDealForm,
} from "@/lib/deals";
import NewDealForm from "../deals/NewDealForm";

interface StartupPageProps {
    onEnter?: () => void;
}

type StartupDealRow = DbDeal;

type DisplayDeal = {
    id: string;
    title: string;
    city: string;
    created: string;
    orgLabel: string;
    raw: StartupDealRow;
};

const StartupPage: React.FC<StartupPageProps> = ({ onEnter }) => {
    const router = useRouter();
    const { setDbDeal, setDeal } = useDealSession();

    const [step, setStep] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    
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

    const filteredDeals = useMemo(() => {
        const formatOrgLabel = (deal: StartupDealRow) => {
            const orgId = deal.orgId ?? deal.org_id ?? "";
            if (deal.orgName && deal.orgName.length > 0) return deal.orgName;
            if (orgId) return `${orgId.slice(0, 8)}…`;
            return "Unknown org";
        };

        const mapped: DisplayDeal[] = deals.map((deal) => {
            const clientLabel =
                formatAddressLine({
                    address: deal.address ?? "",
                    city: deal.city ?? undefined,
                    state: deal.state ?? undefined,
                    zip: deal.zip ?? undefined,
                }) || "Untitled deal";
            const cityState = [deal.city, deal.state, deal.zip].filter(Boolean).join(", ");
            const createdString = new Date(deal.created_at).toLocaleString();

            return {
                id: deal.id,
                title: clientLabel,
                city: cityState,
                created: createdString,
                orgLabel: formatOrgLabel(deal),
                raw: deal,
            };
        });

        let data = [...mapped];
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(d => d.title.toLowerCase().includes(lower) || d.city.toLowerCase().includes(lower));
        }
        
        if (dateFilter) {
            // Simple string match for the date part "M/D/YYYY"
            const dateStr = new Date(dateFilter).toISOString().split('T')[0];
            data = data.filter(d => {
                const dealDate = new Date(d.created);
                return dealDate.toISOString().startsWith(dateStr);
            });
        }

        if (sortOrder === 'newest') {
            data.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        } else if (sortOrder === 'oldest') {
            data.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
        } else if (sortOrder === 'az') {
            data.sort((a, b) => a.title.localeCompare(b.title));
        }

        return data;
    }, [deals, searchTerm, dateFilter, sortOrder]);

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

            router.push(`/overview?dealId=${inserted.id}`);
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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <Icon d={Icons.briefcase} size={20} className="text-text-secondary" />
                            Recent Deals
                        </h3>
                        
                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            <div className="relative w-full md:w-64 group">
                                <input 
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="dark-input h-10 text-sm w-full pl-10 transition-all focus:ring-2 focus:ring-accent-blue/50"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon d={Icons.search} size={16} className="text-text-secondary group-focus-within:text-accent-blue transition-colors" />
                                </div>
                            </div>
                            <div className="w-full md:w-40">
                                <input 
                                    type="date" 
                                    className="dark-input h-10 text-sm w-full"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-40">
                                <select 
                                    value={sortOrder} 
                                    onChange={(e) => setSortOrder(e.target.value)} 
                                    className="dark-select h-10 text-sm w-full py-0 px-3"
                                >
                                    <option value="newest">Sort: Newest</option>
                                    <option value="oldest">Sort: Oldest</option>
                                    <option value="az">Sort: Address (A-Z)</option>
                                </select>
                            </div>
                            <Button
                              variant="neutral"
                              className="whitespace-nowrap"
                              onClick={() => router.push("/deals")}
                            >
                              View all deals
                            </Button>
                        </div>
                    </div>

                    {!dealsLoading && !dealsError && deals.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/10 bg-black/30 p-6 text-center text-text-secondary space-y-2">
                        <p className="text-lg font-semibold text-text-primary">No deals yet</p>
                        <p className="text-sm">
                          Create your first deal to start underwriting, or jump to the full deals list.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <Button variant="primary" onClick={() => setIsNewDealModalOpen(true)}>Create new deal</Button>
                          <Button variant="neutral" onClick={() => router.push("/deals")}>View all deals</Button>
                        </div>
                      </div>
                    ) : (
                    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
                        <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="sticky top-0 bg-brand-navy/95 backdrop-blur-md z-10 text-xs uppercase tracking-wider text-text-secondary font-semibold">
                                    <tr>
                                        <th className="p-4 border-b border-white/10">Property</th>
                                        <th className="p-4 border-b border-white/10 whitespace-nowrap">Org</th>
                                        <th className="p-4 border-b border-white/10">City / State</th>
                                        <th className="p-4 border-b border-white/10 text-right">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {dealsLoading && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-text-secondary">
                                                Loading deals.
                                            </td>
                                        </tr>
                                    )}
                                    {dealsError && !dealsLoading && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-accent-red">
                                                {dealsError}
                                            </td>
                                        </tr>
                                    )}
                                    {!dealsLoading && !dealsError && filteredDeals.map((deal) => (
                                        <tr 
                                            key={deal.id} 
                                            onClick={() => handleSelectDeal(deal.raw)}
                                            className="group cursor-pointer hover:bg-accent-blue/10 transition-colors duration-150"
                                        >
                                            <td className="p-4 text-text-primary font-medium group-hover:text-accent-blue transition-colors">
                                                {deal.title}
                                            </td>
                                            <td className="p-4 text-text-secondary whitespace-nowrap">
                                                {deal.orgLabel}
                                            </td>
                                            <td className="p-4 text-text-secondary">
                                                {deal.city}
                                            </td>
                                            <td className="p-4 text-text-secondary text-right font-mono text-xs">
                                                {deal.created}
                                            </td>
                                        </tr>
                                    ))}
                                    {!dealsLoading && !dealsError && filteredDeals.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-text-secondary">
                                                No deals found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    )}
                    <div className="mt-2 text-right text-xs text-text-secondary/50">
                        Showing {filteredDeals.length} records
                    </div>
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

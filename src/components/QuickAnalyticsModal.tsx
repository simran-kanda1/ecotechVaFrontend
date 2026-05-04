import { Dialog } from "@radix-ui/react-dialog";
import { X, BarChart3, TrendingUp, Users, PhoneCall, Voicemail, CalendarDays, Skull, Loader2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchRetellCalls } from "../lib/retell";
import { startOfToday, startOfYesterday, format } from "date-fns";
import { cn } from "../lib/utils";

interface QuickAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    leads?: any[];
    scheduledCallbacks?: any[];
    /** "today" matches the header quick stats; "range" uses rangeStart/rangeEnd (e.g. call log filter window). */
    mode?: "today" | "range";
    rangeStart?: Date | null;
    rangeEnd?: Date | null;
}

function parseLeadDate(raw: any): Date | null {
    if (!raw) return null;
    const d = raw.seconds != null ? new Date(raw.seconds * 1000) : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

function isInInclusiveRange(d: Date, startMs: number, endMs: number) {
    const t = d.getTime();
    return t >= startMs && t <= endMs;
}

/** Booking outcome on a Retell call record (same signal conversion rate implies). */
function retellCallIndicatesBooking(c: any): boolean {
    return c.call_analysis?.custom_analysis_data?.appointmentBooked === true;
}

function normalizedCustomerPhoneFromRetellCall(c: any): string {
    const raw = c.direction === "inbound" ? c.from_number : c.to_number;
    const digits = String(raw || "").replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Unique customers with at least one booking outcome in the given call list (aligned with conv. rate). */
function uniqueBookingCountFromRetellCalls(calls: any[]): number {
    const phones = new Set<string>();
    for (const c of calls) {
        if (!retellCallIndicatesBooking(c)) continue;
        const key = normalizedCustomerPhoneFromRetellCall(c);
        if (key.length > 0) phones.add(key);
    }
    return phones.size;
}

export function QuickAnalyticsModal({
    isOpen,
    onClose,
    leads = [],
    scheduledCallbacks = [],
    mode = "today",
    rangeStart = null,
    rangeEnd = null,
}: QuickAnalyticsModalProps) {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (!isOpen) return;

        const loadAnalytics = async () => {
            setLoading(true);
            try {
                const isRange =
                    mode === "range" &&
                    rangeStart instanceof Date &&
                    rangeEnd instanceof Date &&
                    !Number.isNaN(rangeStart.getTime()) &&
                    !Number.isNaN(rangeEnd.getTime());

                const answeredFilter = (c: any) =>
                    c.disconnection_reason !== "dial_failed" &&
                    c.disconnection_reason !== "dial_no_answer" &&
                    c.disconnection_reason !== "dial_busy";

                const isVoicemail = (c: any) =>
                    c.call_analysis?.custom_analysis_data?.in_voicemail ||
                    c.call_analysis?.custom_analysis_data?.callOutcome === "voicemail" ||
                    c.disconnection_reason === "voicemail_reached" ||
                    (c.call_analysis?.call_summary?.toLowerCase?.() || "").includes("voicemail");

                const isDeadOutcome = (c: any) =>
                    c.call_analysis?.custom_analysis_data?.callOutcome === "not_interested" ||
                    c.call_analysis?.custom_analysis_data?.callOutcome === "dnc" ||
                    c.call_analysis?.custom_analysis_data?.status === "dead" ||
                    (c.call_analysis?.call_summary?.toLowerCase?.() || "").includes("not interested");

                if (!isRange) {
                    const today = startOfToday();
                    const yesterday = startOfYesterday();

                    const recentCalls = await fetchRetellCalls(2000, {
                        start_timestamp: {
                            lower_threshold: yesterday.getTime(),
                        },
                    });

                    const callsToday = recentCalls.filter((c: any) => c.start_timestamp >= today.getTime());
                    const callsYesterday = recentCalls.filter(
                        (c: any) => c.start_timestamp >= yesterday.getTime() && c.start_timestamp < today.getTime()
                    );

                    const answeredToday = callsToday.filter(answeredFilter);

                    const opportunitiesAddedToday = leads.filter((l) => {
                        const date = parseLeadDate(l.receivedAt || l.createdAt);
                        return date && date >= today;
                    });

                    const totalBooked = uniqueBookingCountFromRetellCalls(callsToday);
                    const conversionRateToday =
                        answeredToday.length > 0 ? (totalBooked / answeredToday.length) * 100 : 0;

                    const connectedCalls = callsToday.filter(answeredFilter);
                    const notConnectedCalls = callsToday.filter(
                        (c: any) =>
                            c.disconnection_reason === "dial_failed" ||
                            c.disconnection_reason === "dial_no_answer" ||
                            c.disconnection_reason === "dial_busy"
                    );

                    const voicemailCalls = callsToday.filter(isVoicemail);
                    const actualAnswered = Math.max(0, connectedCalls.length - voicemailCalls.length);
                    const noAnswerCalls = notConnectedCalls.length;

                    const immediateCallbacks = scheduledCallbacks.filter((c) => c.status === "pending").length;

                    const deadOppsToday = callsToday.filter(isDeadOutcome);

                    setStats({
                        uiMode: "today" as const,
                        periodLabel: "Real-time stats for Today",
                        headerTitle: "Quick Analytics",
                        callsPrimary: callsToday.length,
                        callsCompare: callsYesterday.length,
                        compareTrendLabel: `vs ${callsYesterday.length} yesterday`,
                        callsCardTitle: "Calls Today",
                        conversionRate: conversionRateToday.toFixed(1),
                        uniqueCustomers: opportunitiesAddedToday.length,
                        uniqueCardTitle: "Unique Contacts",
                        uniqueCardHint: "Opportunities added today",
                        bookingsCardHint: "Unique customers with a booking outcome on a call today",
                        connected: connectedCalls.length,
                        notConnected: notConnectedCalls.length,
                        answered: actualAnswered,
                        voicemail: voicemailCalls.length,
                        noAnswer: noAnswerCalls,
                        booked: totalBooked,
                        droppedCalls: immediateCallbacks,
                        deadOpps: deadOppsToday.length,
                        deadCardSub: "Not interested / DNC today",
                    });
                } else {
                    const rs = rangeStart!.getTime();
                    const re = rangeEnd!.getTime();
                    const span = Math.max(0, re - rs);
                    const prevEndMs = rs - 1;
                    const prevStartMs = prevEndMs - span;

                    const recentCalls = await fetchRetellCalls(50000, {
                        start_timestamp: {
                            lower_threshold: prevStartMs,
                            upper_threshold: re,
                        },
                    });

                    const callsInRange = recentCalls.filter(
                        (c: any) => c.start_timestamp >= rs && c.start_timestamp <= re
                    );
                    const callsPrev = recentCalls.filter(
                        (c: any) => c.start_timestamp >= prevStartMs && c.start_timestamp <= prevEndMs
                    );

                    const answeredInRange = callsInRange.filter(answeredFilter);

                    const opportunitiesInRange = leads.filter((l) => {
                        const date = parseLeadDate(l.receivedAt || l.createdAt);
                        return date && isInInclusiveRange(date, rs, re);
                    });

                    const totalBooked = uniqueBookingCountFromRetellCalls(callsInRange);

                    const conversionRate =
                        answeredInRange.length > 0 ? (totalBooked / answeredInRange.length) * 100 : 0;

                    const connectedCalls = callsInRange.filter(answeredFilter);
                    const notConnectedCalls = callsInRange.filter(
                        (c: any) =>
                            c.disconnection_reason === "dial_failed" ||
                            c.disconnection_reason === "dial_no_answer" ||
                            c.disconnection_reason === "dial_busy"
                    );

                    const voicemailCalls = callsInRange.filter(isVoicemail);
                    const actualAnswered = Math.max(0, connectedCalls.length - voicemailCalls.length);
                    const noAnswerCalls = notConnectedCalls.length;

                    const immediateCallbacks = scheduledCallbacks.filter((c) => c.status === "pending").length;

                    const deadInRange = callsInRange.filter(isDeadOutcome);

                    const rangeLabel = `${format(rangeStart!, "MMM d, yyyy")} – ${format(rangeEnd!, "MMM d, yyyy")}`;

                    setStats({
                        uiMode: "range" as const,
                        periodLabel: rangeLabel,
                        headerTitle: "Period analytics",
                        callsPrimary: callsInRange.length,
                        callsCompare: callsPrev.length,
                        compareTrendLabel: `vs ${callsPrev.length} prior period`,
                        callsCardTitle: "Calls in range",
                        conversionRate: conversionRate.toFixed(1),
                        uniqueCustomers: opportunitiesInRange.length,
                        uniqueCardTitle: "New in range",
                        uniqueCardHint: "Opportunities first seen in this window",
                        connected: connectedCalls.length,
                        notConnected: notConnectedCalls.length,
                        answered: actualAnswered,
                        voicemail: voicemailCalls.length,
                        noAnswer: noAnswerCalls,
                        booked: totalBooked,
                        bookingsCardHint: "Unique customers with a booking outcome on a call in this range",
                        droppedCalls: immediateCallbacks,
                        deadOpps: deadInRange.length,
                        deadCardSub: "Not interested / DNC in range",
                    });
                }
            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setLoading(false);
            }
        };

        loadAnalytics();
    }, [isOpen, mode, rangeStart?.getTime(), rangeEnd?.getTime()]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-royal-100 dark:bg-royal-900/30 flex items-center justify-center text-royal-600">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {stats?.headerTitle ?? "Quick Analytics"}
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    {stats?.periodLabel ?? (mode === "range" ? "Selected date range" : "Real-time stats for Today")}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[80vh]">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-4 text-royal-600" />
                                <p>Calculating metrics...</p>
                            </div>
                        ) : stats ? (
                            <div className="space-y-6">
                                {/* Top Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <StatCard
                                        title={stats.callsCardTitle}
                                        value={stats.callsPrimary}
                                        icon={<PhoneCall className="w-4 h-4" />}
                                        trend={stats.compareTrendLabel}
                                        isPositive={stats.callsPrimary >= stats.callsCompare}
                                        color="royal"
                                    />
                                    <StatCard
                                        title="Conv. Rate"
                                        value={`${stats.conversionRate}%`}
                                        icon={<TrendingUp className="w-4 h-4" />}
                                        color="green"
                                    />
                                    <StatCard
                                        title={stats.uniqueCardTitle}
                                        hint={stats.uniqueCardHint}
                                        value={stats.uniqueCustomers}
                                        icon={<Users className="w-4 h-4" />}
                                        color="blue"
                                    />
                                    <StatCard
                                        title="Bookings"
                                        hint={stats.bookingsCardHint}
                                        value={stats.booked}
                                        icon={<CalendarDays className="w-4 h-4" />}
                                        color="purple"
                                    />
                                </div>

                                {/* Connection Breakdown */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                            <PhoneCall className="w-4 h-4 text-slate-400" />
                                            Connection Overview
                                        </h3>
                                        <div className="space-y-3">
                                            <ProgressBar
                                                label="Connected"
                                                value={stats.connected}
                                                total={stats.callsPrimary || 1}
                                                color="bg-emerald-500"
                                            />
                                            <ProgressBar
                                                label="Not Connected"
                                                value={stats.notConnected}
                                                total={stats.callsPrimary || 1}
                                                color="bg-amber-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                            <Voicemail className="w-4 h-4 text-slate-400" />
                                            Outcome Breakdown
                                        </h3>
                                        <div className="space-y-3">
                                            <ProgressBar
                                                label="Answered"
                                                value={stats.answered}
                                                total={stats.callsPrimary || 1}
                                                color="bg-blue-500"
                                            />
                                            <ProgressBar
                                                label="Voicemail"
                                                value={stats.voicemail}
                                                total={stats.callsPrimary || 1}
                                                color="bg-indigo-500"
                                            />
                                            <ProgressBar
                                                label="No Answer"
                                                value={stats.noAnswer}
                                                total={stats.callsPrimary || 1}
                                                color="bg-slate-400"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Alerts / Other Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-5 border border-red-100 dark:border-red-900/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600">
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-red-900 dark:text-red-300">
                                                        Pending Callbacks
                                                    </h3>
                                                    <p className="text-xs text-red-600/70">Opportunities requesting follow up</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-red-700 dark:text-red-400">
                                                {stats.droppedCalls}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                                    <Skull className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                        Dead Opportunities
                                                    </h3>
                                                    <p className="text-xs text-slate-500">{stats.deadCardSub}</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                                {stats.deadOpps}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

function StatCard({ title, value, icon, trend, isPositive, hint, color = "royal" }: any) {
    const colorClasses: Record<string, string> = {
        royal: "text-royal-600 bg-royal-100 dark:bg-royal-900/40",
        green: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40",
        blue: "text-blue-600 bg-blue-100 dark:bg-blue-900/40",
        purple: "text-purple-600 bg-purple-100 dark:bg-purple-900/40",
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">{title}</h3>
                <div className={cn("p-1.5 rounded-lg shrink-0", colorClasses[color])}>{icon}</div>
            </div>
            {hint ? <p className="text-[10px] text-slate-400 mb-2 leading-snug">{hint}</p> : null}
            <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                {trend && (
                    <p
                        className={cn(
                            "text-xs font-medium mt-1",
                            isPositive ? "text-emerald-500" : "text-amber-500"
                        )}
                    >
                        {isPositive ? "↑" : "↓"} {trend}
                    </p>
                )}
            </div>
        </div>
    );
}

function ProgressBar({ label, value, total, color }: any) {
    const percent = Math.min(100, Math.max(0, (value / total) * 100)) || 0;
    return (
        <div>
            <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700 dark:text-slate-300">{label}</span>
                <span className="text-slate-500">
                    {value} ({percent.toFixed(0)}%)
                </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

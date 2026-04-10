import { Dialog } from "@radix-ui/react-dialog";
import { X, BarChart3, TrendingUp, Users, PhoneCall, PhoneOff, Voicemail, CalendarDays, Skull, Loader2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchRetellCalls } from "../lib/retell";
import { startOfToday, startOfYesterday } from "date-fns";
import { cn } from "../lib/utils";

interface QuickAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    leads?: any[];
    scheduledCallbacks?: any[];
}

export function QuickAnalyticsModal({ isOpen, onClose, leads = [], scheduledCallbacks = [] }: QuickAnalyticsModalProps) {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            loadAnalytics();
        }
    }, [isOpen]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const today = startOfToday();
            const yesterday = startOfYesterday();

            // 1. Fetch Retell Calls for the last few days (from yesterday to now)
            const recentCalls = await fetchRetellCalls(2000, {
                start_timestamp: {
                    lower_threshold: yesterday.getTime()
                }
            });

            // 1. Total Daily Calls (Retell)
            const callsToday = recentCalls.filter((c: any) => c.start_timestamp >= today.getTime());
            const callsYesterday = recentCalls.filter((c: any) => c.start_timestamp >= yesterday.getTime() && c.start_timestamp < today.getTime());

            // 2. Conversion Rate (Booked / Total Answered) for Today
            const answeredToday = callsToday.filter((c: any) => c.disconnection_reason !== 'dial_failed' && c.disconnection_reason !== 'dial_no_answer' && c.disconnection_reason !== 'dial_busy');

            // 3. Unique Contacts (Opportunities added today)
            const opportunitiesAddedToday = leads.filter(l => {
                const rawDate = l.receivedAt || l.createdAt;
                if (!rawDate) return false;
                const date = rawDate?.seconds ? new Date(rawDate.seconds * 1000) : new Date(rawDate);
                return date >= today;
            });
            const uniqueContacts = opportunitiesAddedToday.length;

            // 4. Bookings Grabbed From Firebase (Leads booked today)
            // Or leads that exist that have a crmLeadId or appointmentBooked === true AND were created/called today?
            // Actually, just any lead booked today.
            const bookedFirebaseLeadsToday = leads.filter(l => {
                const isBooked = l.appointmentBooked || !!l.crmLeadId || l.custom_analysis_data?.appointmentBooked;
                const rawDate = l.updatedAt || l.receivedAt || l.createdAt;
                if (!rawDate || !isBooked) return false;
                const date = rawDate?.seconds ? new Date(rawDate.seconds * 1000) : new Date(rawDate);
                return date >= today;
            });
            const totalBooked = bookedFirebaseLeadsToday.length;
            const conversionRateToday = answeredToday.length > 0 ? (totalBooked / answeredToday.length) * 100 : 0;

            // 5. Connected vs Not Connected (Today)
            const connectedCalls = callsToday.filter((c: any) => c.disconnection_reason !== 'dial_failed' && c.disconnection_reason !== 'dial_no_answer' && c.disconnection_reason !== 'dial_busy');
            const notConnectedCalls = callsToday.filter((c: any) => c.disconnection_reason === 'dial_failed' || c.disconnection_reason === 'dial_no_answer' || c.disconnection_reason === 'dial_busy');

            // 6. Answered vs Voicemail vs No Answer (Today)
            const voicemailCalls = callsToday.filter((c: any) => c.call_analysis?.custom_analysis_data?.in_voicemail || c.call_analysis?.custom_analysis_data?.callOutcome === "voicemail" || c.disconnection_reason === "voicemail_reached" || c.call_analysis?.call_summary?.toLowerCase().includes("voicemail"));
            const actualAnswered = Math.max(0, connectedCalls.length - voicemailCalls.length);
            const noAnswerCalls = notConnectedCalls.length;

            // 7. Immediate Callbacks required (Opportunities asking to be followed up with)
            const immediateCallbacks = scheduledCallbacks.filter(c => c.status === "pending").length;

            // 8. Dead Opportunities (Today)
            const deadOppsToday = callsToday.filter((c: any) => c.call_analysis?.custom_analysis_data?.callOutcome === 'not_interested' || c.call_analysis?.custom_analysis_data?.callOutcome === 'dnc' || c.call_analysis?.custom_analysis_data?.status === 'dead' || c.call_analysis?.call_summary?.toLowerCase().includes("not interested"));

            setStats({
                callsToday: callsToday.length,
                callsYesterday: callsYesterday.length,
                conversionRateToday: conversionRateToday.toFixed(1),
                uniqueCustomers: uniqueContacts,
                connected: connectedCalls.length,
                notConnected: notConnectedCalls.length,
                answered: actualAnswered,
                voicemail: voicemailCalls.length,
                noAnswer: noAnswerCalls,
                booked: totalBooked,
                droppedCalls: immediateCallbacks, // Representing "Immediate Callbacks"
                deadOpps: deadOppsToday.length
            });

        } catch (error) {
            console.error("Failed to load analytics", error);
        } finally {
            setLoading(false);
        }
    };

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
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Quick Analytics</h2>
                                <p className="text-xs text-slate-500 font-medium">Real-time stats for Today</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
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
                                    <StatCard title="Calls Today" value={stats.callsToday} icon={<PhoneCall className="w-4 h-4" />} trend={`vs ${stats.callsYesterday} yesterday`} isPositive={stats.callsToday >= stats.callsYesterday} color="royal" />
                                    <StatCard title="Conv. Rate" value={`${stats.conversionRateToday}%`} icon={<TrendingUp className="w-4 h-4" />} color="green" />
                                    <StatCard title="Unique Contacts" value={stats.uniqueCustomers} icon={<Users className="w-4 h-4" />} color="blue" />
                                    <StatCard title="Bookings" value={stats.booked} icon={<CalendarDays className="w-4 h-4" />} color="purple" />
                                </div>

                                {/* Connection Breakdown */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                            <PhoneCall className="w-4 h-4 text-slate-400" />
                                            Connection Overview
                                        </h3>
                                        <div className="space-y-3">
                                            <ProgressBar label="Connected" value={stats.connected} total={stats.callsToday || 1} color="bg-emerald-500" />
                                            <ProgressBar label="Not Connected" value={stats.notConnected} total={stats.callsToday || 1} color="bg-amber-500" />
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                            <Voicemail className="w-4 h-4 text-slate-400" />
                                            Outcome Breakdown
                                        </h3>
                                        <div className="space-y-3">
                                            <ProgressBar label="Answered" value={stats.answered} total={stats.callsToday || 1} color="bg-blue-500" />
                                            <ProgressBar label="Voicemail" value={stats.voicemail} total={stats.callsToday || 1} color="bg-indigo-500" />
                                            <ProgressBar label="No Answer" value={stats.noAnswer} total={stats.callsToday || 1} color="bg-slate-400" />
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
                                                    <h3 className="text-sm font-bold text-red-900 dark:text-red-300">Pending Callbacks</h3>
                                                    <p className="text-xs text-red-600/70">Opportunities requesting follow up</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.droppedCalls}</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                                    <Skull className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Dead Opportunities</h3>
                                                    <p className="text-xs text-slate-500">Not interested / DNC today</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.deadOpps}</span>
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

function StatCard({ title, value, icon, trend, isPositive, color = "royal" }: any) {
    const colorClasses: Record<string, string> = {
        royal: "text-royal-600 bg-royal-100 dark:bg-royal-900/40",
        green: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40",
        blue: "text-blue-600 bg-blue-100 dark:bg-blue-900/40",
        purple: "text-purple-600 bg-purple-100 dark:bg-purple-900/40",
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
                <div className={cn("p-1.5 rounded-lg", colorClasses[color])}>
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                {trend && (
                    <p className={cn("text-xs font-medium mt-1", isPositive ? "text-emerald-500" : "text-amber-500")}>
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
                <span className="text-slate-500">{value} ({percent.toFixed(0)}%)</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

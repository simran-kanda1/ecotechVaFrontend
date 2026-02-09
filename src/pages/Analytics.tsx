import { useEffect, useState, useRef } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Header } from "../components/Header";
import { TrendingUp, Phone, Calendar as CalendarIcon, Download, Users, BarChart3, HelpCircle, Activity, ThumbsDown, ThumbsUp, CalendarCheck, Zap, Clock } from "lucide-react";
import { format, isSameDay, eachDayOfInterval, isAfter } from "date-fns";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, CartesianGrid,
    AreaChart, Area
} from "recharts";
import { cn } from "../lib/utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { fetchRetellCalls } from "../lib/retell";

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8884d8', '#82ca9d'];

// Stats Card Component with enhanced styling
function StatCard({ title, value, subtext, icon: Icon, colorClass, delay = 0 }: any) {
    return (
        <div
            className="group relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass.replace('bg-', 'text-')}`}>
                <Icon className="w-24 h-24 transform translate-x-4 -translate-y-4" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                    <div className={cn("p-2 rounded-xl bg-opacity-20", colorClass)}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">{value}</div>
                    {subtext && <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{subtext}</p>}
                </div>
            </div>
        </div>
    );
}

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [calls, setCalls] = useState<any[]>([]); // Leads (Opportunities)
    const [retellCalls, setRetellCalls] = useState<any[]>([]); // Actual Retell calls
    const [scheduledCallbacks, setScheduledCallbacks] = useState<any[]>([]);

    // Explicit refs for 2-page PDF layout
    const page1Ref = useRef<HTMLDivElement>(null);
    const page2Ref = useRef<HTMLDivElement>(null);

    // Fetch All Data
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch LEADS (Source of Truth for Appointments & Opportunities)
                const leadsRef = collection(db, "leads");
                const qLeads = query(leadsRef, orderBy("receivedAt", "desc"), limit(10000));

                let fetchedLeads: any[] = [];
                try {
                    const snap = await getDocs(qLeads);
                    snap.forEach((doc) => {
                        fetchedLeads.push({ id: doc.id, ...doc.data() });
                    });
                } catch (e) {
                    console.warn("Leads fetch error", e);
                }
                setCalls(fetchedLeads);

                // 2. Fetch SCHEDULED CALLBACKS
                const callbacksRef = collection(db, "scheduledCallbacks");
                const qCallbacks = query(callbacksRef, limit(5000));
                let fetchedCallbacks: any[] = [];
                try {
                    const snap = await getDocs(qCallbacks);
                    snap.forEach((doc) => {
                        fetchedCallbacks.push({ id: doc.id, ...doc.data() });
                    });
                } catch (e) {
                    console.warn("Callbacks fetch error", e);
                }
                setScheduledCallbacks(fetchedCallbacks);

                // 3. Fetch RETELL CALLS (Total Call Source)
                try {
                    const rCalls = await fetchRetellCalls(10000);
                    setRetellCalls(rCalls);
                } catch (e) {
                    console.error("Retell fetch error", e);
                }

            } catch (error) {
                console.error("Error fetching analytics data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // --- Processing Data for KPIs ---

    // Constants
    const CAMPAIGN_START = new Date('2026-01-22T00:00:00');

    // 1. Filter Retell Calls
    const filteredRetellCalls = retellCalls.filter(c => {
        if (!c.start_timestamp) return false;
        return c.start_timestamp >= CAMPAIGN_START.getTime();
    });

    const totalCallsCount = filteredRetellCalls.length;

    // 2. Sentiment Analysis
    const negativeSentimentCount = filteredRetellCalls.filter(c => {
        const sentiment = c.call_analysis?.user_sentiment?.toLowerCase() || "";
        return sentiment.includes("negative");
    }).length;

    const positiveSentimentCount = filteredRetellCalls.filter(c => {
        const sentiment = c.call_analysis?.user_sentiment?.toLowerCase() || "";
        return sentiment.includes("positive") || sentiment.includes("neutral");
    }).length;

    // 3. Appointments Booked
    const bookedLeads = calls.filter(c => {
        const booked1 = c.custom_analysis_data?.appointmentBooked;
        const booked2 = c.appointmentBooked;
        return (booked1 === true || booked1 === "true") || (booked2 === true || booked2 === "true");
    });
    const totalBooked = bookedLeads.length;

    // 4. Conversion Rate
    const totalOpportunities = calls.length;
    const conversionRate = totalOpportunities > 0
        ? ((totalBooked / totalOpportunities) * 100).toFixed(1)
        : "0.0";

    // 5. Day Analysis Helper
    function getBestDay(data: any[], dateAccessor: (item: any) => Date | null) {
        const counts: Record<string, number> = {};
        data.forEach(item => {
            const date = dateAccessor(item);
            if (date) {
                const day = format(date, 'EEEE');
                counts[day] = (counts[day] || 0) + 1;
            }
        });

        let maxDay = "N/A";
        let maxCount = 0;
        Object.entries(counts).forEach(([day, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxDay = day;
            }
        });
        return { day: maxDay, count: maxCount };
    }

    const bestBookingDay = getBestDay(bookedLeads, (c) => {
        const t = c.custom_analysis_data?.callCompletedAt || c.receivedAt;
        if (!t) return null;
        return t.seconds ? new Date(t.seconds * 1000) : new Date(t);
    });

    const bestLeadDay = getBestDay(calls, (c) => {
        const t = c.receivedAt;
        if (!t) return null;
        return t.seconds ? new Date(t.seconds * 1000) : new Date(t);
    });

    // 6. Daily Call Volume (Chart)
    const dailyCallVolumeData = (() => {
        const today = new Date();
        const intervalStart = isAfter(today, CAMPAIGN_START) ? CAMPAIGN_START : today;
        const days = eachDayOfInterval({ start: intervalStart, end: today });

        return days.map(day => {
            const count = filteredRetellCalls.filter(c => {
                if (!c.start_timestamp) return false;
                return isSameDay(new Date(c.start_timestamp), day);
            }).length;

            return {
                date: format(day, "MMM dd"),
                calls: count
            };
        });
    })();

    // New Opportunities per Day (Leads receivedAt)
    const opportunitiesData = (() => {
        const today = new Date();
        const intervalStart = isAfter(today, CAMPAIGN_START) ? CAMPAIGN_START : today;
        const days = eachDayOfInterval({ start: intervalStart, end: today });

        return days.map(day => {
            const count = calls.filter(c => {
                const t = c.receivedAt;
                if (!t) return false;
                const d = t.seconds ? new Date(t.seconds * 1000) : new Date(t);
                return isSameDay(d, day);
            }).length;

            return {
                date: format(day, "MMM dd"),
                leads: count
            };
        });
    })();

    // 7. Callback Execution History (Chart)
    const callbackHistoryData = (() => {
        const today = new Date();
        const intervalStart = isAfter(today, CAMPAIGN_START) ? CAMPAIGN_START : today;
        const days = eachDayOfInterval({ start: intervalStart, end: today });

        return days.map(day => {
            const count = scheduledCallbacks.filter(c => {
                if (c.status !== "triggered") return false;
                const t = c.triggeredAt; // Use actual trigger time
                if (!t) return false;
                const d = t.seconds ? new Date(t.seconds * 1000) : new Date(t);
                return isSameDay(d, day);
            }).length;
            return {
                date: format(day, "MMM dd"),
                callbacks: count
            };
        });
    })();

    // Future Callbacks Count
    const totalFutureCallbacks = scheduledCallbacks.filter(c => {
        const t = c.scheduledFor || c.nextCallbackTime;
        if (!t) return false;
        const d = t.seconds ? new Date(t.seconds * 1000) : new Date(t);
        return isAfter(d, new Date()) && c.status !== "triggered";
    }).length;

    // 8. Salesperson Performance
    const salespersonData = (() => {
        const stats: Record<string, number> = {};
        bookedLeads.forEach(lead => {
            let agent = lead.salespersonAssigned || lead.assignedSalesperson || lead.custom_analysis_data?.salespersonAssigned;
            if (agent) {
                stats[agent] = (stats[agent] || 0) + 1;
            }
        });

        return Object.entries(stats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    })();

    // 9. Outcome Distribution
    const outcomeData = calls.reduce((acc: any[], call) => {
        let outcome = call.callOutcome || call.custom_analysis_data?.callOutcome || "Unknown";
        outcome = outcome.toLowerCase();

        if (outcome.includes('voicemail')) outcome = 'Voicemail';
        else if (outcome.includes('answer') && !outcome.includes('no')) outcome = 'Answered';
        else if (outcome.includes('booked')) outcome = 'Booked';
        else if (outcome.includes('failed')) outcome = 'Failed';
        else if (outcome.includes('no_answer')) outcome = 'No Answer';
        else outcome = 'Other';

        const existing = acc.find(i => i.name === outcome);
        if (existing) existing.value++;
        else acc.push({ name: outcome, value: 1 });
        return acc;
    }, []).sort((a: any, b: any) => b.value - a.value);


    // PDF Generation Logic (Two Pages)
    const generatePDF = async () => {
        setIsGeneratingPdf(true);
        // Wait for render to update with "Print Layout"
        setTimeout(async () => {
            try {
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();


                if (page1Ref.current) {
                    const canvas1 = await html2canvas(page1Ref.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
                    const imgData1 = canvas1.toDataURL('image/png');
                    const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
                    pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, imgHeight1);
                }

                if (page2Ref.current) {
                    pdf.addPage();
                    const canvas2 = await html2canvas(page2Ref.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
                    const imgData2 = canvas2.toDataURL('image/png');
                    const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
                    pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, imgHeight2);
                }

                pdf.save(`ecotech-analytics-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            } catch (err) {
                console.error("PDF Gen Error", err);
            } finally {
                setIsGeneratingPdf(false);
            }
        }, 500); // 500ms delay to ensure charts render in new layout
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // --- Render Logic ---

    // If generating PDF, render the "Print View"
    if (isGeneratingPdf) {
        return (
            <div className="bg-white text-slate-900 font-sans min-h-screen p-0 m-0">
                {/* PAGE 1 */}
                <div ref={page1Ref} className="p-8 space-y-8 max-w-[1200px] mx-auto min-h-[1100px] bg-white">
                    {/* Branding Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-slate-900 pb-6 mb-10">
                        <div>
                            <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight">EcoTech Windows & Doors</h2>
                            <div className="flex items-center gap-3 mt-4">
                                <span className="bg-blue-600 text-white text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">AI Voice Agent Report</span>
                                <span className="text-slate-500 font-medium text-lg">
                                    {format(CAMPAIGN_START, 'MMM d, yyyy')} - {format(new Date(), 'MMM d, yyyy')}
                                </span>
                            </div>
                        </div>
                        <div className="text-right mt-6 md:mt-0">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Powered By</p>
                            <p className="text-2xl font-bold text-slate-900">Simvana Digital Agency</p>
                            <div className="flex items-center justify-end gap-2 text-slate-600 font-medium mt-1">
                                <Phone className="w-5 h-5" />
                                <span className="text-lg">+1 (289) 816-6495</span>
                            </div>
                        </div>
                    </div>

                    {/* KPI Stats Grid */}
                    <div className="grid grid-cols-4 gap-6">
                        <StatCard title="Total Calls" value={totalCallsCount.toLocaleString()} subtext="Since Jan 22" icon={Phone} colorClass="bg-blue-100 text-blue-600" />
                        <StatCard title="Conversion Rate" value={`${conversionRate}%`} subtext={`${totalBooked} Booked`} icon={TrendingUp} colorClass="bg-purple-100 text-purple-600" />
                        <StatCard title="Pos. Sentiment" value={positiveSentimentCount.toLocaleString()} subtext={`${totalCallsCount > 0 ? ((positiveSentimentCount / totalCallsCount) * 100).toFixed(1) : 0}%`} icon={ThumbsUp} colorClass="bg-emerald-100 text-emerald-600" />
                        <StatCard title="Neg. Sentiment" value={negativeSentimentCount.toLocaleString()} subtext={`${totalCallsCount > 0 ? ((negativeSentimentCount / totalCallsCount) * 100).toFixed(1) : 0}%`} icon={ThumbsDown} colorClass="bg-red-100 text-red-600" />
                    </div>

                    {/* Stats Row 2 */}
                    <div className="grid grid-cols-3 gap-6">
                        <StatCard title="Busiest Booking Day" value={bestBookingDay.day} subtext={`${bestBookingDay.count} bookings`} icon={CalendarCheck} colorClass="bg-indigo-100 text-indigo-600" />
                        <StatCard title="Busiest Lead Day" value={bestLeadDay.day} subtext={`${bestLeadDay.count} new leads`} icon={Zap} colorClass="bg-orange-100 text-orange-600" />
                        <StatCard title="Queue Workload" value={totalFutureCallbacks.toLocaleString()} subtext="Pending callbacks" icon={Clock} colorClass="bg-amber-100 text-amber-600" />
                    </div>

                    {/* Daily Volume Chart */}
                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                            <Activity className="w-6 h-6 text-blue-500" />
                            Daily Call Volume
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyCallVolumeData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} stroke="#000" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 14 }} dy={10} minTickGap={30} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 14 }} allowDecimals={false} />
                                    <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* PAGE 2 */}
                <div ref={page2Ref} className="p-8 space-y-8 max-w-[1200px] mx-auto min-h-[1100px] bg-white break-before-page">
                    {/* Page 2 Header/Branding Strip */}
                    <div className="border-b border-slate-200 pb-4 flex justify-between items-center opacity-50">
                        <span className="font-bold text-slate-400 uppercase tracking-widest text-sm">EcoTech Windows & Doors - Analytics Report</span>
                        <span className="font-bold text-slate-400 uppercase tracking-widest text-sm">Page 2</span>
                    </div>

                    {/* New Opportunities Chart */}
                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                            <Zap className="w-6 h-6 text-orange-500 mr-4" />
                            New Opportunities per Day
                        </h3>
                        <div className="flex justify-center">
                            <AreaChart width={900} height={300} data={opportunitiesData}>
                                <defs>
                                    <linearGradient id="colorOppsPrint" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} stroke="#000" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 14 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 14 }} allowDecimals={false} />
                                <Area type="monotone" dataKey="leads" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorOppsPrint)" isAnimationActive={false} />
                            </AreaChart>
                        </div>
                    </div>

                    {/* Callbacks History Chart */}
                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                            <CalendarIcon className="w-6 h-6 text-indigo-500 mr-4" />
                            Callback Execution History
                        </h3>
                        <div className="flex justify-center">
                            <AreaChart width={900} height={300} data={callbackHistoryData}>
                                <defs>
                                    <linearGradient id="colorCallbacksPrint" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} stroke="#000" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 14 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 14 }} allowDecimals={false} />
                                <Area type="monotone" dataKey="callbacks" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCallbacksPrint)" isAnimationActive={false} />
                            </AreaChart>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        {/* Top Performers (Expanded - No Scroll) */}
                        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                                <Users className="w-6 h-6 text-emerald-500 mr-4" />
                                Top Sales Performers
                            </h3>
                            <div className="space-y-4">
                                {salespersonData.length > 0 ? (
                                    salespersonData.map((agent, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {idx + 1}
                                                </div>
                                                <span className="font-bold text-slate-700 text-lg">{agent.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-extrabold text-emerald-600">{agent.value}</span>
                                                <span className="text-sm text-slate-400 font-medium">Bookings</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400">No data.</p>
                                )}
                            </div>
                        </div>

                        {/* Outcome & Summary */}
                        <div className="space-y-6">
                            {/* Small Outcome Pie */}
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col items-center">
                                <h3 className="text-xl font-bold text-slate-900 mb-4 w-full text-left flex items-center">
                                    <BarChart3 className="w-5 h-5 text-purple-500 mr-3" />
                                    Outcome Dist.
                                </h3>
                                <div className="w-full flex items-center justify-center gap-4">
                                    {/* Fixed PieChart for PDF */}
                                    <RechartsPieChart width={220} height={220}>
                                        <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" isAnimationActive={false}>
                                            {outcomeData.map((_: any, index: any) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                    </RechartsPieChart>

                                    <div className="pl-4 space-y-2 flex-1">
                                        {outcomeData.slice(0, 5).map((entry: any, index: any) => (
                                            <div key={index} className="flex items-center text-xs justify-between">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                    <span className="truncate max-w-[100px] font-medium">{entry.name}</span>
                                                </div>
                                                <span className="font-bold text-slate-700">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Summary Block */}
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg">
                                <h3 className="text-2xl font-bold mb-4">Summary</h3>
                                <div className="space-y-4 text-blue-50 text-sm leading-relaxed">
                                    <p>
                                        Jan 22 - Present: <strong>{totalCallsCount.toLocaleString()} calls</strong> processed.
                                        <strong> {totalBooked} appointments</strong> from <strong>{totalOpportunities.toLocaleString()} leads</strong>.
                                    </p>
                                    <p>Conversion: <strong>{conversionRate}%</strong></p>
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/20">
                                        <span className="bg-white/10 px-2 py-1 rounded text-xs">👍 {positiveSentimentCount} Pos</span>
                                        <span className="bg-white/10 px-2 py-1 rounded text-xs">👎 {negativeSentimentCount} Neg</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default Render (Screen)
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-20">
            <Header />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Analytics Report
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Data from Jan 22, 2026 to Present
                        </p>
                    </div>
                    {/* PDF Button */}
                    <button
                        onClick={generatePDF}
                        disabled={loading || isGeneratingPdf}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGeneratingPdf ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                Download PDF Report
                            </>
                        )}
                    </button>
                </div>

                {/* Main Screen Layout */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">

                    {/* KPI Section - Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard title="Total Calls" value={totalCallsCount.toLocaleString()} subtext="Since Jan 22" icon={Phone} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30" delay={0} />
                        <StatCard title="Conversion Rate" value={`${conversionRate}%`} subtext={`${totalBooked} Booked / ${totalOpportunities.toLocaleString()} Leads`} icon={TrendingUp} colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30" delay={50} />
                        <StatCard title="Positive Sentiment" value={positiveSentimentCount.toLocaleString()} subtext={`${totalCallsCount > 0 ? ((positiveSentimentCount / totalCallsCount) * 100).toFixed(1) : 0}% (Pos+Neu)`} icon={ThumbsUp} colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" delay={100} />
                        <StatCard title="Negative Sentiment" value={negativeSentimentCount.toLocaleString()} subtext={`${totalCallsCount > 0 ? ((negativeSentimentCount / totalCallsCount) * 100).toFixed(1) : 0}% of Total`} icon={ThumbsDown} colorClass="bg-red-100 text-red-600 dark:bg-red-900/30" delay={150} />
                    </div>

                    {/* KPI Section - Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <StatCard title="Busiest Booking Day" value={bestBookingDay.day} subtext={`Peak activity: ${bestBookingDay.count} bookings`} icon={CalendarCheck} colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30" delay={200} />
                        <StatCard title="Busiest Lead Day" value={bestLeadDay.day} subtext={`High volume: ${bestLeadDay.count} new leads`} icon={Zap} colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30" delay={250} />
                        <StatCard title="Queue Workload" value={totalFutureCallbacks.toLocaleString()} subtext="Pending callbacks" icon={Clock} colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30" delay={300} />
                    </div>

                    {/* Chart Row: Volumes */}
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-500" />
                                Daily Call Volume (Jan 22 - Present)
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyCallVolumeData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} minTickGap={30} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Chart Row: Opportunities */}
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-orange-500" />
                                New Opportunities per Day
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={opportunitiesData}>
                                        <defs>
                                            <linearGradient id="colorOpps" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} minTickGap={30} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} cursor={{ fill: 'transparent' }} />
                                        <Area type="monotone" dataKey="leads" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorOpps)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Chart Row 2: Queue & Sales */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Executed Callbacks Chart */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <CalendarIcon className="w-5 h-5 text-indigo-500" />
                                        Callback Execution History
                                    </h3>
                                    <p className="text-sm text-slate-500">Callbacks triggered per day</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={callbackHistoryData}>
                                        <defs>
                                            <linearGradient id="colorCallbacks" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                                        <Area type="monotone" dataKey="callbacks" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCallbacks)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-500" />
                                Top Sales Performers
                            </h3>
                            <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                {salespersonData.length > 0 ? (
                                    salespersonData.map((agent, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-base ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {idx + 1}
                                                </div>
                                                <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]" title={agent.name}>{agent.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{agent.value}</span>
                                                <span className="text-xs text-slate-400">Bookings</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                                        <HelpCircle className="w-10 h-10 mb-2 opacity-20" />
                                        <p>No sales data available yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Outcome Distribution & Additional Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-purple-500" />
                                Call Outcome Distribution (All Time)
                            </h3>
                            <div className="flex flex-col md:flex-row items-center gap-8 h-[300px]">
                                <div className="w-full md:w-1/2 h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPieChart>
                                            <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {outcomeData.map((_: any, index: any) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full md:w-1/2 grid grid-cols-1 gap-2 overflow-y-auto max-h-[300px]">
                                    {outcomeData.map((entry: any, index: any) => (
                                        <div key={index} className="flex items-center justify-between text-sm p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                <span className="text-slate-600 dark:text-slate-300 capitalize">{entry.name}</span>
                                            </div>
                                            <span className="font-semibold text-slate-900 dark:text-white">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Summary Text / Insight */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 opacity-20 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl"></div>

                            <h3 className="text-2xl font-bold mb-4 relative z-10">Performance Summary</h3>
                            <div className="space-y-4 relative z-10 text-blue-50">
                                <p className="leading-relaxed">
                                    Since January 22, processed <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">{totalCallsCount.toLocaleString()} calls</span>.
                                    <br />
                                    Overall, <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">{totalBooked} appointments</span> have been scheduled from
                                    <span className="font-bold text-white pl-1">{totalOpportunities.toLocaleString()} leads</span>,
                                    achieving a conversion rate of <span className="font-bold text-white">{conversionRate}%</span>.
                                </p>
                                {salespersonData.length > 0 && (
                                    <p className="leading-relaxed">
                                        Top performer: <span className="font-bold text-white border-b border-white/30">{salespersonData[0]?.name || 'N/A'}</span>.
                                    </p>
                                )}
                                <div className="pt-6 mt-6 border-t border-white/20 flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 text-sm font-medium opacity-80 bg-black/20 px-3 py-1.5 rounded-full">
                                        <ThumbsDown className="w-4 h-4 text-red-300" />
                                        {negativeSentimentCount} Negative
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium opacity-80 bg-black/20 px-3 py-1.5 rounded-full">
                                        <ThumbsUp className="w-4 h-4 text-emerald-300" />
                                        {positiveSentimentCount} Positive
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium opacity-80 bg-black/20 px-3 py-1.5 rounded-full">
                                        <ActivityIcon className="w-4 h-4 text-blue-300" />
                                        Data Synced
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActivityIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}

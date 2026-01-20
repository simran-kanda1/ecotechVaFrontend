import { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Header } from "../components/Header";
import { TrendingUp, Phone, CheckCircle, Clock } from "lucide-react";
import { format, isSameDay, subDays, eachDayOfInterval } from "date-fns";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, CartesianGrid
} from "recharts";
import { cn } from "../lib/utils";

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

// Simple stats card component
function StatCard({ title, value, subtext, icon: Icon, colorClass }: any) {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</div>
                {subtext && <p className="text-sm text-slate-500">{subtext}</p>}
            </div>
            <div className={cn("p-3 rounded-xl", colorClass)}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
}

export default function Analytics() {
    const [, setLoading] = useState(true);
    const [calls, setCalls] = useState<any[]>([]);

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // Fetch recent 1000 calls for analytics
                // In production, you might want to use aggregation queries or cloud functions for this
                const leadsRef = collection(db, "leads");
                const q = query(leadsRef, orderBy("receivedAt", "desc"), limit(1000));

                let fetchedCalls: any[] = [];
                try {
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach((doc) => {
                        fetchedCalls.push({ id: doc.id, ...doc.data() });
                    });
                } catch (e) {
                    console.warn("Analytics fetch failed (likely dev mode/no data), using empty array", e);
                }
                setCalls(fetchedCalls);
            } catch (error) {
                console.error("Error fetching analytics data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Process Data
    const totalCalls = calls.length;

    // Status/Outcome Stats
    const totalBooked = calls.filter(c => c.custom_analysis_data?.appointmentBooked || c.appointmentBooked).length;

    // Outcome Distribution
    const outcomes = calls.reduce((acc: any, call) => {
        let outcome = call.callOutcome || call.custom_analysis_data?.callOutcome || "Unknown";
        // Normalize
        outcome = outcome.toLowerCase();
        if (outcome.includes('voicemail')) outcome = 'Voicemail';
        else if (outcome.includes('answer') && !outcome.includes('no')) outcome = 'Answered';
        else if (outcome.includes('failed')) outcome = 'Failed';
        else if (outcome.includes('no_answer')) outcome = 'No Answer';
        else outcome = 'Other';

        acc[outcome] = (acc[outcome] || 0) + 1;
        return acc;
    }, {});

    const outcomeData = Object.keys(outcomes).map(key => ({ name: key, value: outcomes[key] }));

    // Timeline Data (Last 30 days or range)
    const timelineData = (() => {
        const today = new Date();
        const days = eachDayOfInterval({
            start: subDays(today, 14), // Last 14 days
            end: today
        });

        return days.map(day => {
            const dayStr = format(day, "MMM dd");
            // Count calls on this day
            const count = calls.filter(c => {
                let t = c.receivedAt || c.callStartedAt;
                if (!t) return false;
                let d = t.seconds ? new Date(t.seconds * 1000) : new Date(t);
                return isSameDay(d, day);
            }).length;

            const booked = calls.filter(c => {
                let t = c.receivedAt || c.callStartedAt;
                if (!t) return false;
                let d = t.seconds ? new Date(t.seconds * 1000) : new Date(t);
                return isSameDay(d, day) && (c.custom_analysis_data?.appointmentBooked || c.appointmentBooked);
            }).length;

            return { name: dayStr, calls: count, booked: booked };
        });
    })();

    const conversionRate = totalCalls > 0 ? ((totalBooked / totalCalls) * 100).toFixed(1) : "0";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-20">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics Overview</h1>
                        <p className="text-slate-500">Insights from processed calls and AI agent performance.</p>
                    </div>
                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                        {/* Placeholder for future date range filter */}
                        <span className="px-3 py-1 text-xs font-semibold uppercase text-slate-500">Last 14 Days</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Calls"
                        value={totalCalls}
                        subtext="Processed by AI"
                        icon={Phone}
                        colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/40"
                    />
                    <StatCard
                        title="Appointments"
                        value={totalBooked}
                        subtext="Creating opportunities"
                        icon={CheckCircle}
                        colorClass="bg-green-50 text-green-600 dark:bg-green-900/40"
                    />
                    <StatCard
                        title="Conversion Rate"
                        value={`${conversionRate}%`}
                        subtext="Calls to booking"
                        icon={TrendingUp}
                        colorClass="bg-purple-50 text-purple-600 dark:bg-purple-900/40"
                    />
                    <StatCard
                        title="Avg Duration"
                        value="3m 12s"
                        subtext="Est. conversation time"
                        icon={Clock}
                        colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/40"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Timeline Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Call Volume & Bookings</h3>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={timelineData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Calls" />
                                    <Bar dataKey="booked" fill="#10b981" radius={[4, 4, 0, 0]} name="Appointments" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Outcome Distribution Pie Chart */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Call Outcomes</h3>
                        <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={outcomeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {outcomeData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                            {/* Legend Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-3 text-xs">
                                {outcomeData.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center gap-1.5 ">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                        <span className="text-slate-600 dark:text-slate-400">{entry.name} ({entry.value})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

            </main>
        </div>
    );
}

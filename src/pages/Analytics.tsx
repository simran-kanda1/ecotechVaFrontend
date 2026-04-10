import { useEffect, useState, useRef } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Header } from "../components/Header";
import {
    Phone, Calendar as CalendarIcon, Download,
    ThumbsDown, ThumbsUp, Zap,
    TrendingUp, PhoneOff, CheckCircle2,
    RefreshCw
} from "lucide-react";
import { format, isSameDay, eachDayOfInterval, isAfter, isBefore, getDay, getHours } from "date-fns";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, CartesianGrid,
    Legend
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fetchRetellCalls } from "../lib/retell";

// ─── Constants ───────────────────────────────────────────────────────────────
const REPORT_START = new Date("2026-02-22T00:00:00");
const REPORT_END = new Date("2026-03-13T23:59:59");
const AGENT_ID = "agent_298a63eaae62f545bfc84329a6";
const FROM_NUMBER = "+12898166495";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toDate(val: any): Date | null {
    if (!val) return null;
    if (val.seconds) return new Date(val.seconds * 1000);
    if (typeof val === "string" || typeof val === "number") return new Date(val);
    return null;
}

function inRange(d: Date | null) {
    if (!d) return false;
    return !isBefore(d, REPORT_START) && !isAfter(d, REPORT_END);
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, accent = "#2563eb" }: any) {
    return (
        <div style={{ borderTop: `3px solid ${accent}` }} className="bg-white p-5 rounded">
            <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
                <Icon className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
            {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        </div>
    );
}

function SectionTitle({ children }: any) {
    return (
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">
            {children}
        </h2>
    );
}

// ─── PDF Page Wrapper ─────────────────────────────────────────────────────────
function PdfPage({ children, pageRef }: any) {
    return (
        <div
            ref={pageRef}
            style={{ width: 1100, backgroundColor: "#fff", padding: 56, fontFamily: "Georgia, serif" }}
        >
            {children}
        </div>
    );
}

function PdfHeader({ page, total }: any) {
    return (
        <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #1e293b", paddingBottom: 16 }}>
                <div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>EcoTech Windows & Doors</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>AI Voice Agent Performance Report &nbsp;·&nbsp; Feb 22 – Mar 13, 2026</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Prepared by Simvana Digital Agency</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>+1 (289) 816-6495 &nbsp;·&nbsp; Page {page} of {total}</div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [leads, setLeads] = useState<any[]>([]);
    const [retellCalls, setRetellCalls] = useState<any[]>([]);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [salesRankings, setSalesRankings] = useState<any[]>([]);

    const page1Ref = useRef<HTMLDivElement>(null);
    const page2Ref = useRef<HTMLDivElement>(null);
    const page3Ref = useRef<HTMLDivElement>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                // Leads
                const leadsSnap = await getDocs(query(collection(db, "leads"), orderBy("receivedAt", "desc"), limit(9999)));
                setLeads(leadsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // Callbacks mapping removed since it was unused

                // Activity Logs
                const alSnap = await getDocs(query(collection(db, "activityLogs"), limit(5000)));
                setActivityLogs(alSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // Sales Rankings
                const srSnap = await getDocs(query(collection(db, "salesRankings"), limit(500)));
                setSalesRankings(srSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // Recent Bookings mapping removed since it was unused

                // Retell — use same limit as original working code
                const rc = await fetchRetellCalls(50000);
                setRetellCalls(rc);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // ── Filter Retell calls: match original approach exactly ─────────────
    // Filter by call_type + date range (same as original Analytics.tsx)
    // Additionally scope to EcoTech's agent or from_number when available
    const filteredRetell = retellCalls.filter(c => {
        if (!c.start_timestamp) return false;
        if (c.call_type !== "phone_call") return false;
        const d = new Date(c.start_timestamp);
        if (isBefore(d, REPORT_START) || isAfter(d, REPORT_END)) return false;
        // If agent_id is present, use it to scope; otherwise fall back to from_number
        if (c.agent_id) return c.agent_id === AGENT_ID;
        if (c.from_number) return c.from_number === FROM_NUMBER;
        return true; // include if neither field exists
    });

    // ── Filter Leads in date range ────────────────────────────────────────
    const filteredLeads = leads.filter(l => inRange(toDate(l.receivedAt)));

    // ── KPIs ──────────────────────────────────────────────────────────────
    const totalCalls = filteredRetell.length;
    const totalOpportunities = filteredLeads.length;

    // Sentiment
    const posCalls = filteredRetell.filter(c => {
        const s = (c.call_analysis?.user_sentiment || "").toLowerCase();
        return s.includes("positive") || s.includes("neutral");
    }).length;
    const negCalls = filteredRetell.filter(c => {
        const s = (c.call_analysis?.user_sentiment || "").toLowerCase();
        return s.includes("negative");
    }).length;
    const posPct = totalCalls > 0 ? ((posCalls / totalCalls) * 100).toFixed(1) : "0.0";
    const negPct = totalCalls > 0 ? ((negCalls / totalCalls) * 100).toFixed(1) : "0.0";

    // Transferred computation removed since it was unused

    // Booked — from leads
    const bookedLeads = filteredLeads.filter(l => {
        const b1 = l.custom_analysis_data?.appointmentBooked;
        const b2 = l.appointmentBooked;
        return b1 === true || b1 === "true" || b2 === true || b2 === "true";
    });
    const totalBooked = bookedLeads.length;
    const convRate = totalOpportunities > 0 ? ((totalBooked / totalOpportunities) * 100).toFixed(1) : "0.0";

    // ── Retell Disconnect Reasons ─────────────────────────────────────────
    const disconnectReasons = filteredRetell.reduce((acc: Record<string, number>, c) => {
        let r = c.disconnection_reason || "unknown";
        // Skip retell errors
        if (r.toLowerCase().includes("retell_error") || r.toLowerCase().includes("error")) return acc;
        // Normalize
        if (r === "user_hangup") r = "User Hangup";
        else if (r === "agent_hangup") r = "Agent Hangup";
        else if (r === "dial_busy") r = "Dial Busy";
        else if (r === "dial_no_answer") r = "No Answer";
        else if (r === "voicemail_reached") r = "Voicemail";
        else if (r === "invalid_destination") r = "Invalid Destination";
        else if (r === "call_transfer") r = "Transferred";
        else if (r === "inactivity") r = "Inactivity";
        else r = r.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        acc[r] = (acc[r] || 0) + 1;
        return acc;
    }, {});
    const disconnectData = Object.entries(disconnectReasons)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // ── Day of Week Most Booked ───────────────────────────────────────────
    const dayOfWeekBookings: Record<number, number> = {};
    bookedLeads.forEach(l => {
        const d = toDate(l.custom_analysis_data?.callCompletedAt || l.receivedAt);
        if (d) {
            const dow = getDay(d);
            dayOfWeekBookings[dow] = (dayOfWeekBookings[dow] || 0) + 1;
        }
    });
    const bestDow = Object.entries(dayOfWeekBookings).sort((a, b) => +b[1] - +a[1])[0];
    const bestDowName = bestDow ? DAY_NAMES[+bestDow[0]] : "N/A";
    const bestDowCount = bestDow ? bestDow[1] : 0;

    // ── Time of Day Most Answered ─────────────────────────────────────────
    const hourBuckets: Record<number, number> = {};
    filteredRetell.forEach(c => {
        const answered = !["dial_no_answer", "voicemail_reached", "dial_busy", "invalid_destination"].includes(c.disconnection_reason || "");
        if (answered && c.start_timestamp) {
            const h = getHours(new Date(c.start_timestamp));
            hourBuckets[h] = (hourBuckets[h] || 0) + 1;
        }
    });
    const bestHourEntry = Object.entries(hourBuckets).sort((a, b) => +b[1] - +a[1])[0];
    const bestHour = bestHourEntry ? +bestHourEntry[0] : null;
    const bestHourStr = bestHour !== null
        ? (bestHour === 0 ? "12 AM" : bestHour < 12 ? `${bestHour} AM` : bestHour === 12 ? "12 PM" : `${bestHour - 12} PM`)
        : "N/A";

    // ── Never Answered (cross-ref Retell) ────────────────────────────────
    // For each lead, check if ALL retell calls with that phone number = no answer
    const phoneToRetellCalls: Record<string, typeof filteredRetell> = {};
    filteredRetell.forEach(c => {
        const num = c.to_number || c.from_number || "";
        if (!phoneToRetellCalls[num]) phoneToRetellCalls[num] = [];
        phoneToRetellCalls[num].push(c);
    });

    const neverAnsweredCount = filteredLeads.filter(l => {
        const phone = l.phone || l.phoneNumber || l.custom_analysis_data?.phone || "";
        const relatedCalls = phoneToRetellCalls[phone] || [];
        if (relatedCalls.length === 0) return false; // Can't determine without retell data
        const noAnswerReasons = ["dial_no_answer", "voicemail_reached", "dial_busy", "invalid_destination"];
        return relatedCalls.every(c => noAnswerReasons.includes(c.disconnection_reason || ""));
    }).length;

    // ── Avg Calls Before Booking ──────────────────────────────────────────
    const callsPerBookedLead: number[] = [];
    bookedLeads.forEach(l => {
        const phone = l.phone || l.phoneNumber || l.custom_analysis_data?.phone || "";
        const relatedCalls = phoneToRetellCalls[phone] || [];
        if (relatedCalls.length > 0) callsPerBookedLead.push(relatedCalls.length);
    });
    const avgCallsBeforeBooking = callsPerBookedLead.length > 0
        ? (callsPerBookedLead.reduce((a, b) => a + b, 0) / callsPerBookedLead.length).toFixed(1)
        : "N/A";

    // ── Activity Log — Who Made Most Edits ────────────────────────────────
    const editCounts: Record<string, number> = {};
    activityLogs.forEach(log => {
        // Try every likely email/name field — skip raw UIDs
        const user =
            log.userEmail ||
            log.email ||
            log.performedBy ||
            log.performedByEmail ||
            log.modifiedBy ||
            log.changedBy ||
            log.userName ||
            log.displayName ||
            log.user ||
            null;
        if (!user) return;
        // Skip raw Firebase UIDs (no @ sign, no spaces, long string)
        if (!user.includes("@") && !user.includes(" ") && user.length > 25) return;
        editCounts[user] = (editCounts[user] || 0) + 1;
    });
    const topEditors = Object.entries(editCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // ── Sales Rankings ────────────────────────────────────────────────────
    // salesRankings docs each have a `rankings` array with nested salesperson data
    // Structure: doc.rankings[].rawData.last3Months.deals[0].salespersonName / soldLead / periodScore
    const allReps: { name: string; score: number; bookings: number; closingRate: number; region: string }[] = [];
    salesRankings.forEach(doc => {
        const rankingsArr = doc.rankings || [];
        rankingsArr.forEach((entry: any) => {
            // Get name + stats from the most recent period (last3Months)
            const deal = entry.rawData?.last3Months?.deals?.[0] || entry.rawData?.lastMonth?.deals?.[0] || {};
            const name = deal.salespersonName || entry.name || null;
            if (!name) return;
            const score = entry.metrics?.last3Months?.periodScore || entry.metrics?.lastMonth?.periodScore || 0;
            const bookings = deal.soldLead || entry.metrics?.last3Months?.soldLeads || 0;
            const closingRate = deal.closingRatio || entry.metrics?.last3Months?.closingRatio || 0;
            const region = deal.region || "";
            // Avoid duplicates — keep highest score entry per person
            const existing = allReps.find(r => r.name === name);
            if (existing) {
                if (score > existing.score) {
                    existing.score = score;
                    existing.bookings = bookings;
                    existing.closingRate = closingRate;
                }
            } else {
                allReps.push({ name, score, bookings, closingRate, region });
            }
        });
    });
    const topSalesReps = allReps.sort((a, b) => b.score - a.score).slice(0, 10);

    // Fallback to booked leads if salesRankings is empty or unparseable
    const salespersonFromLeads = (() => {
        const stats: Record<string, number> = {};
        bookedLeads.forEach(l => {
            const agent = l.salespersonAssigned || l.assignedSalesperson || l.custom_analysis_data?.salespersonAssigned;
            if (agent) stats[agent] = (stats[agent] || 0) + 1;
        });
        return Object.entries(stats)
            .map(([name, bookings]) => ({ name, score: 0, bookings, closingRate: 0, region: "" }))
            .sort((a, b) => b.bookings - a.bookings).slice(0, 10);
    })();

    const displayedSalesReps = topSalesReps.length > 0 ? topSalesReps : salespersonFromLeads;

    // ── Daily Volume Chart ────────────────────────────────────────────────
    const days = eachDayOfInterval({ start: REPORT_START, end: REPORT_END });
    const dailyCallData = days.map(day => ({
        date: format(day, "MMM d"),
        calls: filteredRetell.filter(c => c.start_timestamp && isSameDay(new Date(c.start_timestamp), day)).length,
        booked: bookedLeads.filter(l => {
            const d = toDate(l.custom_analysis_data?.callCompletedAt || l.receivedAt);
            return d && isSameDay(d, day);
        }).length,
    }));

    // ── Hour of Day Distribution ──────────────────────────────────────────
    const hourlyData = Array.from({ length: 14 }, (_, i) => i + 8).map(h => ({
        hour: h <= 12 ? `${h === 0 ? 12 : h} AM` : `${h === 12 ? 12 : h - 12} PM`,
        answered: hourBuckets[h] || 0,
    }));

    // ── Day of Week Distribution ──────────────────────────────────────────
    const dowData = DAY_NAMES.map((name, i) => ({
        day: name.slice(0, 3),
        bookings: dayOfWeekBookings[i] || 0,
    }));

    // ─────────────────────────────────────────────────────────────────────
    // PDF Generation
    // ─────────────────────────────────────────────────────────────────────
    const generatePDF = async () => {
        setGenerating(true);
        await new Promise(r => setTimeout(r, 600));
        try {
            const pdf = new jsPDF("p", "mm", "a4");
            const W = pdf.internal.pageSize.getWidth();

            for (let i = 1; i <= 3; i++) {
                const ref = [page1Ref, page2Ref, page3Ref][i - 1];
                if (!ref.current) continue;
                const canvas = await html2canvas(ref.current, {
                    scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
                    width: 1100, windowWidth: 1100
                });
                const imgData = canvas.toDataURL("image/png");
                const imgH = (canvas.height * W) / canvas.width;
                if (i > 1) pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, 0, W, imgH);
            }

            pdf.save(`ecotech-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    // LOADING
    // ─────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Loading report data…</p>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // PDF PRINT VIEW (hidden off-screen but rendered)
    // ─────────────────────────────────────────────────────────────────────
    const pdfView = (
        <div style={{ position: "fixed", top: -9999, left: -9999, width: 1100, zIndex: -1, fontFamily: "Georgia, serif" }}>
            {/* ── PAGE 1 ── */}
            <PdfPage pageRef={page1Ref}>
                <PdfHeader page={1} total={3} />

                {/* KPI Row 1 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
                    {[
                        { label: "Total Calls", value: totalCalls.toLocaleString(), sub: "Feb 22 – Mar 13" },
                        { label: "Opportunities", value: totalOpportunities.toLocaleString(), sub: "Unique leads" },
                        { label: "Appointments Booked", value: totalBooked.toLocaleString(), sub: `${convRate}% conversion` },
                        { label: "Avg Calls / Booking", value: avgCallsBeforeBooking, sub: "Before appointment" },
                    ].map(k => (
                        <div key={k.label} style={{ border: "1px solid #e2e8f0", borderTop: "3px solid #2563eb", padding: 16, borderRadius: 4 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{k.label}</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "8px 0 4px" }}>{k.value}</div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{k.sub}</div>
                        </div>
                    ))}
                </div>

                {/* KPI Row 2 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
                    {[
                        { label: "Pos/Neutral Sentiment", value: `${posPct}%`, sub: `${posCalls} calls` },
                        { label: "Negative Sentiment", value: `${negPct}%`, sub: `${negCalls} calls` },
                        { label: "Never Answered", value: neverAnsweredCount.toLocaleString(), sub: "All calls = no answer" },
                        { label: "Best Booking Day", value: bestDowName, sub: `${bestDowCount} bookings` },
                    ].map(k => (
                        <div key={k.label} style={{ border: "1px solid #e2e8f0", borderTop: "3px solid #0891b2", padding: 16, borderRadius: 4 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{k.label}</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "8px 0 4px" }}>{k.value}</div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{k.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Daily Volume Chart */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Daily Call & Booking Volume</div>
                    <BarChart width={988} height={220} data={dailyCallData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={20} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Bar dataKey="calls" fill="#2563eb" radius={[2, 2, 0, 0]} name="Calls" isAnimationActive={false} />
                        <Bar dataKey="booked" fill="#16a34a" radius={[2, 2, 0, 0]} name="Booked" isAnimationActive={false} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                    </BarChart>
                </div>

                {/* Disconnect Reasons Table */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Call Outcome Breakdown</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                        {disconnectData.slice(0, 9).map((item, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span style={{ fontSize: 11, color: "#334155" }}>{item.name}</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </PdfPage>

            {/* ── PAGE 2 ── */}
            <PdfPage pageRef={page2Ref}>
                <PdfHeader page={2} total={3} />

                {/* Two charts side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Best Time to Reach Prospects</div>
                        <BarChart width={460} height={200} data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Bar dataKey="answered" fill="#0891b2" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Bookings by Day of Week</div>
                        <BarChart width={460} height={200} data={dowData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Bar dataKey="bookings" fill="#7c3aed" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </div>
                </div>

                {/* Sales Reps Table */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Top Sales Representatives</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f8fafc" }}>
                                <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>#</th>
                                <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Name</th>
                                <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Region</th>
                                <th style={{ padding: "8px 12px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Bookings</th>
                                <th style={{ padding: "8px 12px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Close %</th>
                                <th style={{ padding: "8px 12px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedSalesReps.map((rep, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: 700 }}>{i + 1}</td>
                                    <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 600 }}>{rep.name}</td>
                                    <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 11 }}>{rep.region || "—"}</td>
                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#16a34a", fontWeight: 700 }}>{rep.bookings}</td>
                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontSize: 11 }}>{rep.closingRate > 0 ? `${rep.closingRate.toFixed(1)}%` : "—"}</td>
                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#2563eb", fontWeight: 700 }}>{rep.score > 0 ? Math.round(rep.score).toLocaleString() : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Top Editors Table */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Most Active System Users (Activity Log)</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f8fafc" }}>
                                <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>#</th>
                                <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>User</th>
                                <th style={{ padding: "8px 12px", textAlign: "right", color: "#64748b", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Total Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topEditors.map((e, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: 700 }}>{i + 1}</td>
                                    <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 600 }}>{e.name}</td>
                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#d97706", fontWeight: 700 }}>{e.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </PdfPage>

            {/* ── PAGE 3 — Summary ── */}
            <PdfPage pageRef={page3Ref}>
                <PdfHeader page={3} total={3} />

                {/* Sentiment Pie */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Sentiment Distribution</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                            <RechartsPieChart width={200} height={180}>
                                <Pie data={[
                                    { name: "Positive/Neutral", value: posCalls },
                                    { name: "Negative", value: negCalls },
                                    { name: "Unknown", value: Math.max(0, totalCalls - posCalls - negCalls) },
                                ]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" isAnimationActive={false}>
                                    <Cell fill="#16a34a" strokeWidth={0} />
                                    <Cell fill="#dc2626" strokeWidth={0} />
                                    <Cell fill="#e2e8f0" strokeWidth={0} />
                                </Pie>
                            </RechartsPieChart>
                            <div style={{ fontSize: 12 }}>
                                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#16a34a" }} />
                                    <span style={{ color: "#334155" }}>Positive/Neutral: <strong>{posPct}%</strong></span>
                                </div>
                                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#dc2626" }} />
                                    <span style={{ color: "#334155" }}>Negative: <strong>{negPct}%</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Key Findings */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Key Findings</div>
                        <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.8 }}>
                            <p>• <strong>{totalCalls.toLocaleString()}</strong> total calls placed between Feb 22 – Mar 13, 2026.</p>
                            <p>• <strong>{totalOpportunities.toLocaleString()}</strong> unique opportunities generated, resulting in <strong>{totalBooked}</strong> booked appointments ({convRate}% conversion).</p>
                            <p>• Prospects are most reachable at <strong>{bestHourStr}</strong>. Most bookings occur on <strong>{bestDowName}s</strong>.</p>
                            <p>• <strong>{neverAnsweredCount}</strong> leads never answered across all attempts.</p>
                            <p>• On average, it takes <strong>{avgCallsBeforeBooking}</strong> calls before an appointment is booked.</p>
                            <p>• Sentiment: {posPct}% positive/neutral, {negPct}% negative.</p>
                        </div>
                    </div>
                </div>

                {/* Outcome Dist Chart full width */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>Full Outcome Distribution</div>
                    <BarChart width={988} height={200} data={disconnectData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} width={120} />
                        <Bar dataKey="value" radius={[0, 2, 2, 0]} isAnimationActive={false}>
                            {disconnectData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                </div>

                {/* Footer */}
                <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8" }}>
                    <span>EcoTech Windows & Doors — AI Voice Agent Report — Confidential</span>
                    <span>Generated {format(new Date(), "MMMM d, yyyy")} by Simvana Digital Agency</span>
                </div>
            </PdfPage>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────
    // SCREEN VIEW
    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {pdfView}
            <Header />

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Voice Agent Report</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Feb 22 – Mar 13, 2026 &nbsp;·&nbsp; EcoTech Windows & Doors</p>
                    </div>
                    <button
                        onClick={generatePDF}
                        disabled={generating}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
                    >
                        {generating ? (
                            <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
                        ) : (
                            <><Download className="w-4 h-4" /> Download PDF</>
                        )}
                    </button>
                </div>

                {/* KPI Grid Row 1 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <KPI label="Total Calls" value={totalCalls.toLocaleString()} sub="Feb 22 – Mar 13" icon={Phone} accent="#2563eb" />
                    <KPI label="Opportunities" value={totalOpportunities.toLocaleString()} sub="Unique leads" icon={Zap} accent="#7c3aed" />
                    <KPI label="Booked" value={totalBooked.toLocaleString()} sub={`${convRate}% conversion rate`} icon={CheckCircle2} accent="#16a34a" />
                    <KPI label="Avg Calls / Booking" value={avgCallsBeforeBooking} sub="Before appointment booked" icon={TrendingUp} accent="#d97706" />
                </div>

                {/* KPI Grid Row 2 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <KPI label="Pos/Neutral Sentiment" value={`${posPct}%`} sub={`${posCalls} calls`} icon={ThumbsUp} accent="#16a34a" />
                    <KPI label="Negative Sentiment" value={`${negPct}%`} sub={`${negCalls} calls`} icon={ThumbsDown} accent="#dc2626" />
                    <KPI label="Never Answered" value={neverAnsweredCount.toLocaleString()} sub="All retell attempts = no answer" icon={PhoneOff} accent="#94a3b8" />
                    <KPI label="Best Booking Day" value={bestDowName} sub={`${bestDowCount} bookings on record`} icon={CalendarIcon} accent="#0891b2" />
                </div>

                {/* Daily Volume Chart */}
                <div className="bg-white rounded border border-slate-200 p-6 mb-4">
                    <SectionTitle>Daily Call & Booking Volume</SectionTitle>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={dailyCallData} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={20} />
                            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                            <Bar dataKey="calls" fill="#2563eb" radius={[2, 2, 0, 0]} name="Calls" />
                            <Bar dataKey="booked" fill="#16a34a" radius={[2, 2, 0, 0]} name="Booked" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Two charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded border border-slate-200 p-6">
                        <SectionTitle>Best Time to Reach Prospects</SectionTitle>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid #e2e8f0" }} />
                                <Bar dataKey="answered" fill="#0891b2" radius={[2, 2, 0, 0]} name="Answered" />
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-slate-400 mt-2">Peak: <span className="font-semibold text-slate-600">{bestHourStr}</span></p>
                    </div>

                    <div className="bg-white rounded border border-slate-200 p-6">
                        <SectionTitle>Bookings by Day of Week</SectionTitle>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={dowData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid #e2e8f0" }} />
                                <Bar dataKey="bookings" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-slate-400 mt-2">Highest: <span className="font-semibold text-slate-600">{bestDowName}</span></p>
                    </div>
                </div>

                {/* Call Outcome Breakdown */}
                <div className="bg-white rounded border border-slate-200 p-6 mb-4">
                    <SectionTitle>Call Outcome Breakdown</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {disconnectData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-sm text-slate-600">{item.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sales Reps & Editors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Sales Reps */}
                    <div className="bg-white rounded border border-slate-200 p-6">
                        <SectionTitle>Top Sales Representatives</SectionTitle>
                        <div className="space-y-2">
                            {displayedSalesReps.length > 0 ? displayedSalesReps.map((rep, i) => (
                                <div key={i} className="py-2 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                                            <span className="text-sm font-medium text-slate-800">{rep.name}</span>
                                            {rep.region && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{rep.region}</span>}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="text-green-600 font-semibold">{rep.bookings} booked</span>
                                            {rep.closingRate > 0 && <span className="text-slate-400 text-xs">{rep.closingRate.toFixed(1)}% close</span>}
                                            {rep.score > 0 && <span className="text-blue-500 text-xs font-mono">{Math.round(rep.score).toLocaleString()}</span>}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-400">No data available.</p>
                            )}
                        </div>
                    </div>

                    {/* Top Editors */}
                    <div className="bg-white rounded border border-slate-200 p-6">
                        <SectionTitle>Most Active System Users</SectionTitle>
                        <div className="space-y-2">
                            {topEditors.length > 0 ? topEditors.map((e, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                                        <span className="text-sm font-medium text-slate-800">{e.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-amber-600">{e.count} actions</span>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-400">No activity log data.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-white rounded border border-slate-200 p-6">
                    <SectionTitle>Summary</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600 leading-relaxed">
                        <div className="space-y-2">
                            <p>Between February 22 and March 13, 2026, the EcoTech voice agent placed <strong className="text-slate-900">{totalCalls.toLocaleString()} total calls</strong> across <strong className="text-slate-900">{totalOpportunities.toLocaleString()} unique leads</strong>.</p>
                            <p>Of those, <strong className="text-slate-900">{totalBooked} appointments</strong> were successfully booked — a conversion rate of <strong className="text-slate-900">{convRate}%</strong>.</p>
                            <p>On average, it takes <strong className="text-slate-900">{avgCallsBeforeBooking} calls</strong> to secure a booking. <strong className="text-slate-900">{neverAnsweredCount} leads</strong> never answered across all retry attempts.</p>
                        </div>
                        <div className="space-y-2">
                            <p>Sentiment analysis shows <strong className="text-green-700">{posPct}% positive/neutral</strong> and <strong className="text-red-600">{negPct}% negative</strong> caller interactions.</p>
                            <p>Prospects are most reachable at <strong className="text-slate-900">{bestHourStr}</strong>, and bookings are most likely to occur on <strong className="text-slate-900">{bestDowName}s</strong>.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
import { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Header } from "../components/Header";
import { AddLeadModal } from "../components/AddLeadModal";
import { CallDetailModal } from "../components/CallDetailModal";
import { Loader2, PhoneIncoming, CheckCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Phone, Clock, User, Plus } from "lucide-react";
import { format, isAfter, isBefore, subMonths, addMonths } from "date-fns";
import { cn } from "../lib/utils";
import { MOCK_CALLS } from "../data/mock-data";

// Type definitions
type Call = any;

const ITEMS_PER_PAGE = 50;

export default function Dashboard() {
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

    // Billing Cycle State
    // Default to current date to calculate the relevant billing cycle
    const [currentCycleDate, setCurrentCycleDate] = useState(new Date());

    // Pagination State (Client-side for filtered results)
    const [currentPage, setCurrentPage] = useState(1);

    // Helper to calculate billing cycle range
    const getBillingCycle = (date: Date) => {
        let start, end;
        if (date.getDate() >= 22) {
            start = new Date(date.getFullYear(), date.getMonth(), 22);
            end = new Date(date.getFullYear(), date.getMonth() + 1, 21, 23, 59, 59);
        } else {
            start = new Date(date.getFullYear(), date.getMonth() - 1, 22);
            end = new Date(date.getFullYear(), date.getMonth(), 21, 23, 59, 59);
        }
        return { start, end };
    };

    const { start, end } = getBillingCycle(currentCycleDate);

    // Fetch data
    useEffect(() => {
        async function fetchCalls() {
            setLoading(true);
            try {
                // Fetching a larger batch to handle client-side filtering comfortably 
                // In a perfect world, we'd query by date range in Firestore, but that requires composite indexes we might not have yet.
                // We'll fetch 1000 recent calls to be safe for a month's view.
                const leadsRef = collection(db, "leads");
                const q = query(leadsRef, orderBy("receivedAt", "desc"), limit(1000));

                let fetchedCalls: Call[] = [];
                try {
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach((doc) => {
                        fetchedCalls.push({ id: doc.id, ...doc.data() });
                    });
                } catch (e) {
                    console.log("Firebase/Network error, falling back to mock", e);
                }

                if (fetchedCalls.length === 0) {
                    // Only use mock if absolutely no data comes back (and we are in dev/demo mode)
                    // Check if environment is likely dev or if config is dummy
                    // For now, just append mock data if empty for review
                    fetchedCalls = [...MOCK_CALLS];
                }

                setCalls(fetchedCalls);
            } catch (error) {
                console.error("Error fetching calls:", error);
                setCalls([...MOCK_CALLS]);
            } finally {
                setLoading(false);
            }
        }

        fetchCalls();
    }, []);

    // Filter calls by billing cycle
    const filteredCalls = calls.filter((call) => {
        let dateStr = call.receivedAt || call.callStartedAt;
        if (!dateStr) return false;

        let date;
        if (dateStr?.seconds) {
            date = new Date(dateStr.seconds * 1000);
        } else {
            date = new Date(dateStr);
        }

        return isAfter(date, start) && isBefore(date, end);
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredCalls.length / ITEMS_PER_PAGE);
    const paginatedCalls = filteredCalls.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Cycle Navigation
    const nextCycle = () => {
        setCurrentCycleDate(prev => addMonths(prev, 1));
        setCurrentPage(1);
    };

    const prevCycle = () => {
        setCurrentCycleDate(prev => subMonths(prev, 1));
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
            <Header />

            <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Dashboard Controls / Stats */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">

                    {/* Billing Cycle Selector - Modernized */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <button onClick={prevCycle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="px-4 text-center min-w-[200px]">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Billing Cycle</p>
                                <div className="flex items-center justify-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                                    <CalendarIcon className="w-4 h-4 text-royal-600" />
                                    <span>{format(start, "MMM d")} - {format(end, "MMM d, yyyy")}</span>
                                </div>
                            </div>
                            <button onClick={nextCycle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsAddLeadOpen(true)}
                            className="flex items-center gap-2 bg-royal-600 hover:bg-royal-700 text-white px-4 py-3 rounded-xl shadow-lg shadow-royal-900/20 transition-all font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Lead</span>
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-4">
                        <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-royal-600 rounded-lg">
                                <PhoneIncoming className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Total Calls</p>
                                <p className="text-lg font-bold">{filteredCalls.length}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Appointments</p>
                                <p className="text-lg font-bold">
                                    {filteredCalls.filter(c => c.custom_analysis_data?.appointmentBooked || c.appointmentBooked).length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">

                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            Call Logs
                            <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {paginatedCalls.length} visible
                            </span>
                        </h2>

                        {/* Pagination Controls (Top) */}
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="mr-2">Page {currentPage} of {Math.max(1, totalPages)}</span>
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-royal-600" />
                            <p>Loading call data...</p>
                        </div>
                    ) : filteredCalls.length === 0 ? (
                        <div className="p-20 text-center text-slate-500">
                            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Phone className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No calls found</h3>
                            <p className="text-slate-400 max-w-sm mx-auto mt-1">
                                There are no call logs for the billing cycle {format(start, "MMM d")} - {format(end, "MMM d")}.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[180px]">Date & Time</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[240px]">Customer</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[140px]">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[140px]">Outcome</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedCalls.map((call) => {
                                        const customData = call.custom_analysis_data || {};
                                        // Determine timestamp
                                        let timestamp = call.receivedAt || call.callStartedAt;
                                        let dateObj = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp || new Date());
                                        const isBooked = customData.appointmentBooked || call.appointmentBooked;

                                        // Address fallback
                                        const address = call.address || call.callAnalysis?.address || customData.city || "Unknown Location";

                                        return (
                                            <tr
                                                key={call.id || Math.random()}
                                                onClick={() => setSelectedCall(call)}
                                                className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all duration-200"
                                            >
                                                {/* Date Block */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                            {format(dateObj, "MMM d, yyyy")}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                                            <Clock className="w-3 h-3" />
                                                            {format(dateObj, "h:mm a")}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Customer Block */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                                {customData.firstName || call.firstName || "Unknown"} {customData.lastName || call.lastName}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                                                {call.phoneNumber}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Address Block */}
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-600 dark:text-slate-400 max-w-[250px] truncate">
                                                        {address}
                                                    </div>
                                                    {call.crmLeadId && (
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500">
                                                            LEAD: {call.crmLeadId}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status Pill */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5",
                                                        call.callStatus === "ended" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-amber-50 text-amber-700"
                                                    )}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full", call.callStatus === "ended" ? "bg-slate-400" : "bg-amber-400")}></span>
                                                        {call.callStatus}
                                                    </span>
                                                </td>

                                                {/* Outcome/Result */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {isBooked ? (
                                                        <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full w-fit">
                                                            <CheckCircle className="w-4 h-4" />
                                                            Booked
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-500 capitalize px-2">
                                                            {call.callOutcome || "No outcome"}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Bottom Pagination */}
                    {filteredCalls.length > 0 && (
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm rounded border bg-white disabled:opacity-50 hover:bg-slate-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm rounded border bg-white disabled:opacity-50 hover:bg-slate-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <CallDetailModal
                isOpen={!!selectedCall}
                onClose={() => setSelectedCall(null)}
                call={selectedCall}
            />

            <AddLeadModal
                isOpen={isAddLeadOpen}
                onClose={() => setIsAddLeadOpen(false)}
                onSuccess={() => {
                    // Refresh data or show success toast
                    console.log("Lead added successfully");
                    // Optionally trigger a refresh of the calls list here if we had a dedicated refresh function exposed or by tweaking an effect dependency
                }}
            />
        </div>
    );
}

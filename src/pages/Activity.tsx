import { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Header } from "../components/Header";
import { Loader2, Activity as ActivityIcon, User, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Activity() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            setLoading(true);
            try {
                const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"), limit(100));
                const snapshot = await getDocs(q);
                const fetchedLogs: any[] = [];
                snapshot.forEach(doc => {
                    fetchedLogs.push({ id: doc.id, ...doc.data() });
                });
                setLogs(fetchedLogs);
            } catch (error) {
                console.error("Error fetching activity logs:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchLogs();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
            <Header />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <ActivityIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Activity Feed</h1>
                        <p className="text-slate-500 text-sm">Track team actions and updates</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                            <p>Loading activity...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-20 text-center text-slate-500">
                            <ActivityIcon className="w-8 h-8 mx-auto mb-3 opacity-20" />
                            <p>No activity recorded yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {logs.map((log) => {
                                const dateObj = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : new Date();
                                return (
                                    <div key={log.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                                                <p className="text-sm">
                                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{log.userEmail}</span>
                                                    {' '}
                                                    <span className="text-slate-500">{log.action}</span>
                                                </p>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {format(dateObj, "MMM d, h:mm a")}
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                                {log.details}
                                            </div>
                                            {log.leadName !== "Unknown" && (
                                                <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500">
                                                    Lead: {log.leadName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

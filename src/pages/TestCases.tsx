import { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { collection, query, limit, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Play, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "../lib/utils";

interface TestCase {
    testName?: string;
    validated?: string;
    severityLevel?: string;
    result?: "Pass" | "Fail" | "Warning" | string;
    lastRunTime?: string;
    failDetails?: string;
}

interface TestRun {
    id: string;
    allPassed: boolean;
    timestamp?: any;
    runDate?: string;
    results?: TestCase[];
}

export default function TestCases() {
    const [latestRun, setLatestRun] = useState<TestRun | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRetriggering, setIsRetriggering] = useState(false);
    const [retriggerMessage, setRetriggerMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, "dailyTestRuns"),
            orderBy("__name__", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setLatestRun({ id: doc.id, ...doc.data() } as TestRun);
            } else {
                setLatestRun(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching test runs:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRetrigger = async () => {
        setIsRetriggering(true);
        setRetriggerMessage(null);
        try {
            // Usually webhooks can be triggered via GET or POST. 
            // Given it's a webhook to trigger tests, we will send a simple POST request.
            // Using "no-cors" as the Cloud Function lacks CORS headers.
            const response = await fetch("https://us-central1-ecotech-5166a.cloudfunctions.net/dailyTests", {
                method: "POST",
                mode: "no-cors"
            });
            // Opaque response means request fired but we can't read the exact status, assume success if no network error
            if (response.ok || response.type === "opaque") {
                setRetriggerMessage({ type: "success", text: "Tests started successfully. Results will update shortly." });
            } else {
                throw new Error("Failed to trigger tests");
            }
        } catch (error) {
            console.error("Error retriggering tests:", error);
            // Try fallback with GET in case it only accepts GET
            try {
                const getResponse = await fetch("https://us-central1-ecotech-5166a.cloudfunctions.net/dailyTests", {
                    mode: "no-cors"
                });
                if (getResponse.ok || getResponse.type === "opaque") {
                    setRetriggerMessage({ type: "success", text: "Tests started successfully. Results will update shortly." });
                } else {
                    throw new Error("Failed via GET as well");
                }
            } catch (fallbackError) {
                setRetriggerMessage({ type: "error", text: "Failed to trigger tests. Please check console." });
            }
        } finally {
            setIsRetriggering(false);
            // clear message after 5 seconds
            setTimeout(() => setRetriggerMessage(null), 5000);
        }
    };

    const getStatusIcon = (status?: string | boolean) => {
        const isPass = status === "Pass" || status === true;
        const isFail = status === "Fail" || status === false;
        const isWarning = status === "Warning";

        if (isPass) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
        if (isFail) return <XCircle className="w-5 h-5 text-red-500" />;
        if (isWarning) return <AlertCircle className="w-5 h-5 text-amber-500" />;
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    };

    const getStatusText = (test: TestCase) => {
        if (test.result) return test.result;
        return "Unknown";
    };

    const resolveTestsArray = (results?: TestCase[]): TestCase[] => {
        if (!results) return [];
        return results;
    };

    const testsList = resolveTestsArray(latestRun?.results);

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Test Cases</h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Latest Run: {latestRun?.id || "N/A"}
                            {latestRun && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium ml-2 border",
                                    latestRun.allPassed
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-red-50 text-red-700 border-red-200"
                                )}>
                                    {latestRun.allPassed ? "All Passed" : "Issue Detected"}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <button
                            onClick={handleRetrigger}
                            disabled={isRetriggering}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm",
                                isRetriggering
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-royal-600 hover:bg-royal-700 text-white shadow-royal-600/20"
                            )}
                        >
                            <Play className={cn("w-4 h-4", isRetriggering && "animate-pulse")} />
                            {isRetriggering ? "Triggering..." : "Retrigger Tests"}
                        </button>
                        {retriggerMessage && (
                            <p className={cn(
                                "text-sm text-right",
                                retriggerMessage.type === "success" ? "text-emerald-600" : "text-red-600"
                            )}>
                                {retriggerMessage.text}
                            </p>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-600"></div>
                    </div>
                ) : !latestRun || testsList.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No Test Data Found</h3>
                        <p className="text-slate-500">There are no test runs available for today or no tests were found in the latest run.</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden auto-rows-max overflow-x-auto">
                        <table className="min-w-[1000px] w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/6">Test Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/5">What is being validated</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/12">Severity</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/6">Last run time</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/12">Result</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">Fail Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {testsList.map((test, index) => {
                                    const statusText = getStatusText(test);
                                    const isFail = statusText === "Fail";

                                    return (
                                        <tr key={index} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors", isFail && "bg-red-50/30 dark:bg-red-900/10")}>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{test.testName || "Unknown Test"}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-600 dark:text-slate-300">{test.validated || "N/A"}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                                                    test.severityLevel === "High" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                        test.severityLevel === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                )}>
                                                    {test.severityLevel || "Standard"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {test.lastRunTime ? new Date(test.lastRunTime).toLocaleString() : (latestRun?.runDate ? new Date(latestRun.runDate).toLocaleString() : (latestRun?.id || "N/A"))}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(test.result)}
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        isFail ? "text-red-600 dark:text-red-400" :
                                                            (statusText === "Warning" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")
                                                    )}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3" title={test.failDetails || ""}>
                                                    {test.failDetails || "-"}
                                                </p>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}

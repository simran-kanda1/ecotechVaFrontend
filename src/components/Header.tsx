import { useNavigate, Link, useLocation } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { LogOut } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

export function Header() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSystemPaused, setIsSystemPaused] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "systemConfig", "status"), (docSnap) => {
            if (docSnap.exists()) {
                setIsSystemPaused(docSnap.data().isSystemPaused || false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await auth.signOut();
        navigate("/login");
    };

    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-4 lg:gap-8">
                        {/* Agency Branding */}
                        <div className="flex items-center gap-3">
                            <img src="/simvana-logo.png" alt="Simvana" className="w-9 h-9 rounded-xl shadow-sm" />
                            <div className="hidden lg:block">
                                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                                    Simvana
                                </h1>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Digital Agency</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                        {/* Client Context / Profile */}
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="w-8 h-8 rounded-full bg-royal-100 dark:bg-royal-900/50 text-royal-700 dark:text-royal-300 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-slate-900">
                                EW
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
                                    EcoTech Windows & Doors
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        {!isSystemPaused && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                        <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", isSystemPaused ? "bg-red-500" : "bg-green-500")}></span>
                                    </span>
                                    <p className={cn("text-[10px] font-medium uppercase tracking-wider", isSystemPaused ? "text-red-500" : "text-slate-500")}>
                                        {isSystemPaused ? "System Paused" : "Voice Agent Ready"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <nav className="hidden md:flex items-center gap-1">
                            <Link
                                to="/"
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    location.pathname === "/"
                                        ? "bg-royal-50 text-royal-700 dark:bg-royal-900/20 dark:text-royal-300"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/analytics"
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    location.pathname === "/analytics"
                                        ? "bg-royal-50 text-royal-700 dark:bg-royal-900/20 dark:text-royal-300"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                Analytics
                            </Link>
                            <Link
                                to="/activity"
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    location.pathname === "/activity"
                                        ? "bg-royal-50 text-royal-700 dark:bg-royal-900/20 dark:text-royal-300"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                Activity
                            </Link>
                            <Link
                                to="/test-cases"
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    location.pathname === "/test-cases"
                                        ? "bg-royal-50 text-royal-700 dark:bg-royal-900/20 dark:text-royal-300"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                Test Cases
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none transition-colors"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

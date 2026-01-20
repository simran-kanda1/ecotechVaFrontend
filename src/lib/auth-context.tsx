import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading };
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!loading && !user) {
            navigate("/login", { state: { from: location } });
        }
    }, [user, loading, navigate, location]);

    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
    }

    return user ? <>{children}</> : null;
}

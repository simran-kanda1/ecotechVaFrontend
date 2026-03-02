import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

export const logActivity = async (action: string, details: string, leadId?: string, leadName?: string) => {
    try {
        const user = auth.currentUser;
        if (!user) return; // Silent fail if no user

        await addDoc(collection(db, "activityLogs"), {
            action,
            details,
            leadId: leadId || null,
            leadName: leadName || "Unknown",
            userId: user.uid,
            userEmail: user.email,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};

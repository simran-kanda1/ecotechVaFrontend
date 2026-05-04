import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export type OutboundWindowSlot = "10am" | "6pm";

/**
 * Infer which outbound window (10am vs 6pm) a past call time aligns with, in Toronto time.
 */
export function inferOutboundWindowFromTime(referenceTime: Date): OutboundWindowSlot | undefined {
    const getTorontoTime = (date: Date) => {
        return new Date(date.toLocaleString("en-US", { timeZone: "America/Toronto" }));
    };
    const t = getTorontoTime(referenceTime);
    const minutes = t.getHours() * 60 + t.getMinutes();
    const ten = 10 * 60;
    const six = 18 * 60;
    const distTen = Math.abs(minutes - ten);
    const distSix = Math.abs(minutes - six);
    if (distTen <= 90) return "10am";
    if (distSix <= 90) return "6pm";
    if (minutes < 14 * 60) return "10am";
    if (minutes >= 14 * 60) return "6pm";
    return undefined;
}

/**
 * Next manual callback slot in Toronto: 10:00 or 18:00 only, alternating from the previous window when known.
 * If `previousSlot` is omitted, uses the earliest upcoming 10am or 6pm.
 */
export function getNextCallbackTime(previousSlot?: OutboundWindowSlot): Date {
    // Helper to check time in Toronto
    const getTorontoTime = (date: Date) => {
        return new Date(date.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    };

    const now = new Date();
    const torontoNow = getTorontoTime(now);

    const slot10 = { h: 10, m: 0 };
    const slot18 = { h: 18, m: 0 };

    const callbackSlots =
        previousSlot === "10am"
            ? [slot18]
            : previousSlot === "6pm"
                ? [slot10]
                : [slot10, slot18];

    // Find next callback slot
    let targetTime = new Date(torontoNow);
    let found = false;

    // 1. Check later today (pick earliest qualifying slot today)
    let bestToday: Date | null = null;
    for (const slot of callbackSlots) {
        const candidate = new Date(torontoNow);
        candidate.setHours(slot.h, slot.m, 0, 0);
        if (candidate.getTime() > torontoNow.getTime() + 5 * 60 * 1000) {
            if (!bestToday || candidate.getTime() < bestToday.getTime()) {
                bestToday = candidate;
            }
        }
    }
    if (bestToday) {
        targetTime = bestToday;
        found = true;
    }

    // 2. If no slots today, schedule for tomorrow at first slot in list
    if (!found) {
        targetTime = new Date(torontoNow);
        targetTime.setDate(targetTime.getDate() + 1);
        targetTime.setHours(callbackSlots[0].h, callbackSlots[0].m, 0, 0);
    }

    // Convert local time back to UTC Date object
    const targetYear = targetTime.getFullYear();
    const targetMonth = targetTime.getMonth();
    const targetDay = targetTime.getDate();
    const targetHour = targetTime.getHours();
    const targetMinute = targetTime.getMinutes();

    // Start with a guess (UTC = Local + 5 hours)
    let guessDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, targetHour + 5, targetMinute));

    // Refine loop
    for (let i = 0; i < 5; i++) {
        const checkString = guessDate.toLocaleString('en-US', {
            timeZone: 'America/Toronto',
            hour12: false,
            year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
        });

        const [datePart, timePart] = checkString.split(', ');
        if (!datePart || !timePart) break;


        const [h, min] = timePart.split(':').map(Number);

        const producedTimeVal = h * 60 + min;
        const desiredTimeVal = targetHour * 60 + targetMinute;

        const diffMinutes = desiredTimeVal - producedTimeVal;

        if (diffMinutes === 0) break;

        // Adjust guess
        guessDate.setTime(guessDate.getTime() + diffMinutes * 60000);
    }

    return guessDate;
}

/**
 * Format phone number to dashed format: 519-123-4567
 */
export function formatPhoneNumber(phoneNumber: string | undefined): string {
    if (!phoneNumber) return "";
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Check if it's a standard 10 or 11 digit number
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Fallback if it's too short or not recognized
    return phoneNumber;
}

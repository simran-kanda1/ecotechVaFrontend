import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Get next callback time in EST/EDT (Toronto Time)
 * Callback times: 10am, 2pm, 6pm, 7:45pm local Toronto time
 */
export function getNextCallbackTime(): Date {
    // Helper to check time in Toronto
    const getTorontoTime = (date: Date) => {
        return new Date(date.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    };

    const now = new Date();
    const torontoNow = getTorontoTime(now);

    // Callback slots (hours and minutes)
    const callbackSlots = [
        { h: 10, m: 0 },   // 10:00 AM
        { h: 14, m: 0 },   // 2:00 PM
        { h: 18, m: 0 },   // 6:00 PM
        { h: 19, m: 45 }   // 7:45 PM
    ];

    // Find next callback slot
    let targetTime = new Date(torontoNow);
    let found = false;

    // 1. Check later today
    for (const slot of callbackSlots) {
        // create candidate time for today
        const candidate = new Date(torontoNow);
        candidate.setHours(slot.h, slot.m, 0, 0);

        // If candidate is in the future (with 5 min buffer to avoid immediate execution issues)
        if (candidate.getTime() > torontoNow.getTime() + 5 * 60 * 1000) {
            targetTime = candidate;
            found = true;
            break;
        }
    }

    // 2. If no slots today, schedule for tomorrow at first slot
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

        const [m, d, y] = datePart.split('/').map(Number);
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

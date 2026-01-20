export const MOCK_CALLS = [
    {
        "id": "mock_1",
        "address": "5292 Forest Hill Drive",
        "appointmentBooked": true,
        "appointmentDate": "2026-01-21",
        "appointmentTime": "20:00",
        "assignedSalesperson": "Chenghuai Wu",
        "callAnalysis": {
            "call_successful": true,
            "call_summary": "The agent called Simran from EcoTech Windows and Doors to schedule an appointment for a new front door consultation. They confirmed the address and booked an appointment for Wednesday, January 21 at 8:00 PM with product specialist Leonardo Fonseca. The agent also sent a confirmation SMS and informed Simran about the appointment confirmation call the night before."
        },
        "custom_analysis_data": {
            "appointmentBooked": true,
            "appointmentDate": "2026-01-21",
            "appointmentTime": "20:00",
            "crmLeadId": "62569",
            "hadPreviousQuote": false,
            "numberOfDoors": 1,
            "productsInterested": "front door",
            "salespersonAssigned": "Leonardo Fonseca",
            "in_voicemail": false,
            "user_sentiment": "Positive",
            "callCompletedAt": "2026-01-19T20:12:57-05:00",
            "callDuration": 237,
            "callEndedAt": "2026-01-19T20:12:54-05:00",
            "callId": "call_e88d3a0df54f20583347fccdb67",
            "callOutcome": "answered",
            "callStartedAt": "2026-01-19T20:08:57-05:00",
            "callStatus": "ended",
            "callSummary": "The agent called Simran from EcoTech Windows and Doors...",
            "callTriggered": true,
            "callTriggeredAt": "2026-01-19T20:08:51-05:00",
            "city": "Mississauga",

        },
        "firstName": "Simran",
        "lastName": "Kanda",
        "phoneNumber": "+14167227917",
        "receivedAt": "2026-01-19T20:08:49-05:00",
        "transcriptUrl": "https://example.com",
        "transcript": "Agent: Hey, is this Simran? User: Yes. Speaking...",
        "callStatus": "ended",
        "callOutcome": "answered"
    },
    {
        "id": "mock_2",
        "address": "1998 Madison Avenue",
        "appointmentBooked": false,
        "callAnalysis": {
            "call_successful": false,
            "call_summary": "The call was forwarded to voicemail and the agent left a message for Simran from EcoTech Windows and Doors."
        },
        "custom_analysis_data": {
            "appointmentBooked": false,
            "in_voicemail": true,
            "user_sentiment": "Neutral",
            "callCompletedAt": "2026-01-19T20:00:46-05:00",
            "callDuration": 24,
            "callOutcome": "failed",
            "callStartedAt": "2026-01-19T20:00:20-05:00",
            "callStatus": "ended",
        },
        "firstName": "Simran",
        "lastName": "Kanda",
        "phoneNumber": "+16478027505",
        "receivedAt": "2026-01-19T17:17:33-05:00",
        "transcriptUrl": "https://example.com",
        "transcript": "Agent: Hey, is this Simran? User: Your call has been forwarded...",
        "callStatus": "ended",
        "callOutcome": "voicemail"
    }
];

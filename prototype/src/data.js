/*
 * CareNexa Wireframe Prototype — Mock Data
 * All names, dates, and clinical content below are FICTIONAL and generated
 * for demonstration purposes only. No real patient information is used.
 * This file is plain data — no network calls, no persistence.
 */
window.CN = window.CN || {};

CN.SEED = {
  clinic: {
    name: "Willowbrook Psychology Group",
    tagline: "Attentive, evidence-based therapy for individuals, couples, and families.",
    phone: "(555) 019-2231",
    address: "142 Birchwood Lane, Suite 3, Springvale",
    hours: "Mon–Fri, 8:00 AM–7:00 PM"
  },

  services: [
    { id: "svc-individual", name: "Individual Therapy", format: "individual", duration: 50,
      blurb: "One-on-one sessions focused on your goals, at your pace." },
    { id: "svc-couples", name: "Couples Therapy", format: "couples", duration: 60,
      blurb: "Structured support for partners working through challenges together." },
    { id: "svc-family", name: "Family Therapy", format: "family", duration: 60,
      blurb: "Whole-family sessions to improve communication and connection." },
    { id: "svc-group", name: "Group Therapy", format: "group", duration: 90,
      blurb: "Peer support sessions guided by a licensed facilitator." },
    { id: "svc-assessment", name: "Initial Assessment", format: "individual", duration: 60,
      blurb: "A first session to understand your needs and plan next steps." }
  ],

  therapists: [
    {
      id: "t-hayes", name: "Dr. Maria Hayes", credentials: "PsyD",
      initials: "MH", color: "#4C7C74",
      specialties: ["Anxiety", "Depression", "CBT"],
      services: ["svc-individual", "svc-assessment", "svc-group"],
      formats: ["in-person", "virtual"],
      bio: "Dr. Hayes uses cognitive-behavioral approaches to help clients build practical, lasting coping skills.",
      nextAvailable: "Tomorrow, 10:00 AM"
    },
    {
      id: "t-okafor", name: "Dr. James Okafor", credentials: "PhD",
      initials: "JO", color: "#8A6D3B",
      specialties: ["Couples Therapy", "Family Systems"],
      services: ["svc-couples", "svc-family"],
      formats: ["in-person", "virtual"],
      bio: "Dr. Okafor specializes in family-systems approaches to help partners and families reconnect.",
      nextAvailable: "Thu, 2:00 PM"
    },
    {
      id: "t-bennett", name: "Dr. Aisha Bennett", credentials: "LCSW",
      initials: "AB", color: "#6E5A9C",
      specialties: ["Trauma-Focused Therapy", "Group Therapy"],
      services: ["svc-individual", "svc-group"],
      formats: ["virtual"],
      bio: "Dr. Bennett offers trauma-informed, virtual-only care with a warm, collaborative style.",
      nextAvailable: "Mon, 9:00 AM"
    },
    {
      id: "t-rivera", name: "Dr. Sam Rivera", credentials: "PsyD",
      initials: "SR", color: "#B0653F",
      specialties: ["Child & Adolescent", "Family Therapy"],
      services: ["svc-family", "svc-individual"],
      formats: ["in-person"],
      bio: "Dr. Rivera works with children, teens, and families navigating school, behavior, and transitions.",
      nextAvailable: "Wed, 11:30 AM"
    }
  ],

  // Demo staff login — displayed openly on the Login screen since this is a
  // non-production wireframe prototype (Journey B persona: Dr. Hayes).
  staffUser: {
    id: "t-hayes", role: "therapist", name: "Dr. Maria Hayes",
    email: "dr.hayes@carenexa-demo.test", password: "therapy123",
    mfaCode: "123456"
  },

  clients: [
    {
      id: "c-ellis", name: "Jordan Ellis", initials: "JE", color: "#4C7C74",
      dob: "1994-03-11", status: "Active", assignedTherapist: "t-hayes",
      service: "svc-individual", payerType: "Self-Pay",
      riskFlag: true,
      riskNote: "Elevated risk indicators noted 2026-07-22. Safety plan on file. Reviewed weekly.",
      diagnoses: ["Generalized Anxiety Disorder (example code F41.1)"],
      source: "Website inquiry, booked 2026-06-02",
      nextAppointment: "Today, 9:00 AM — Individual Therapy (In-person)",
      treatmentPlans: [
        {
          id: "tp-1", label: "Individual Therapy — Active Plan", status: "Active",
          targetDate: "2026-10-01", reviewDate: "2026-09-01",
          goals: [
            { id: "g1", text: "Reduce frequency of anxiety symptoms", status: "On Track",
              objectives: ["Practice grounding technique daily", "Track anxiety triggers in a log"] },
            { id: "g2", text: "Improve sleep quality", status: "At Risk",
              objectives: ["Establish consistent wind-down routine"] }
          ]
        }
      ],
      assessments: [
        { id: "as-1", instrument: "PHQ-9", history: [
          { date: "2026-06-05", score: 18 },
          { date: "2026-07-03", score: 13 },
          { date: "2026-08-01", score: 9 }
        ]}
      ],
      notes: [
        {
          id: "note-1", apptDate: "2026-08-01", template: "SOAP", status: "signed",
          author: "Dr. Maria Hayes", signedAt: "2026-08-01 3:42 PM",
          fields: {
            "Subjective": "Client reports improved mood since last session; describes using the grounding technique “most days.” Sleep remains inconsistent.",
            "Objective": "Client appeared engaged and articulate. Affect congruent with reported mood.",
            "Assessment": "Continued gradual improvement in anxiety symptoms; sleep remains a target area.",
            "Plan": "Continue weekly sessions. Introduce sleep hygiene worksheet next session. Reviewed safety plan — no changes."
          },
          addenda: [
            { id: "add-1", author: "Dr. Maria Hayes", timestamp: "2026-08-02 9:10 AM",
              text: "Clarifying note: client's safety plan was reviewed verbally and remains unchanged; no new risk indicators identified during this review." }
          ]
        },
        {
          id: "note-2", apptDate: "2026-07-25", template: "SOAP", status: "signed",
          author: "Dr. Maria Hayes", signedAt: "2026-07-25 4:15 PM",
          fields: {
            "Subjective": "Client reports a stressful week at work; anxiety symptoms increased mid-week.",
            "Objective": "Client was tearful briefly but self-regulated using breathing technique during session.",
            "Assessment": "Situational increase in anxiety; coping skills being applied effectively.",
            "Plan": "Reinforce grounding technique. Follow up on work stressor next session."
          },
          addenda: []
        }
      ],
      forms: [
        { id: "f1", name: "Intake Questionnaire", cycle: "Initial Intake — 2026", status: "Complete" },
        { id: "f2", name: "Insurance & Contact Update", cycle: "Administrative Re-intake — 2026", status: "Outstanding" }
      ],
      consent: { status: "Signed", version: "v2", date: "2026-06-02" },
      documents: [],
      messages: [
        { id: "m1", from: "client", text: "Hi Dr. Hayes, just confirming I'm still on for Friday?", time: "Aug 10, 2:14 PM" },
        { id: "m2", from: "staff", text: "Yes, confirmed for Friday at 9:00 AM. See you then!", time: "Aug 10, 3:02 PM" }
      ],
      billing: { balance: 45.00, invoices: [
        { id: "inv-1", date: "2026-08-01", service: "Individual Therapy Session", amount: 145.00, status: "Paid" },
        { id: "inv-2", date: "2026-08-08", service: "Individual Therapy Session", amount: 145.00, status: "Outstanding" }
      ]}
    },
    {
      id: "c-kim", name: "Taylor Kim", initials: "TK", color: "#6E5A9C",
      dob: "1990-11-02", status: "Active", assignedTherapist: "t-hayes",
      service: "svc-couples", payerType: "Insurance",
      riskFlag: false, riskNote: "",
      diagnoses: [],
      source: "Phone inquiry, booked 2026-05-14",
      nextAppointment: "Today, 10:30 AM — Couples Therapy (Virtual)",
      treatmentPlans: [
        { id: "tp-2", label: "Couples Therapy — Active Plan", status: "Active",
          targetDate: "2026-11-01", reviewDate: "2026-09-15",
          goals: [
            { id: "g3", text: "Improve communication during conflict", status: "On Track",
              objectives: ["Practice active-listening exercise weekly"] }
          ]}
      ],
      assessments: [],
      notes: [
        { id: "note-3", apptDate: "2026-08-04", template: "DAP", status: "signed",
          author: "Dr. Maria Hayes", signedAt: "2026-08-04 5:05 PM",
          fields: {
            "Data": "Both partners attended. Discussed a recent disagreement about household responsibilities.",
            "Assessment": "Pattern of escalation identified; both partners receptive to structured communication tools.",
            "Plan": "Introduce active-listening exercise. Follow up on practice at next session."
          },
          addenda: [] }
      ],
      forms: [{ id: "f3", name: "Intake Questionnaire", cycle: "Initial Intake — 2026", status: "Complete" }],
      consent: { status: "Signed", version: "v1", date: "2026-05-14" },
      documents: [{ id: "d1", name: "Insurance Card (front).pdf", uploadedBy: "Reception", date: "2026-05-14" }],
      messages: [],
      billing: { balance: 0.00, invoices: [
        { id: "inv-3", date: "2026-08-04", service: "Couples Therapy Session", amount: 175.00, status: "Paid" }
      ]}
    },
    {
      id: "c-reyes", name: "Morgan Reyes", initials: "MR", color: "#B0653F",
      dob: "1988-06-19", status: "Active", assignedTherapist: "t-okafor",
      service: "svc-family", payerType: "Self-Pay",
      riskFlag: false, riskNote: "",
      diagnoses: [], source: "Website inquiry, booked 2026-07-01",
      nextAppointment: "Today, 1:00 PM — Family Therapy (In-person)",
      treatmentPlans: [], assessments: [], notes: [], forms: [], documents: [], messages: [],
      consent: { status: "Signed", version: "v1", date: "2026-07-01" },
      billing: { balance: 0, invoices: [] }
    },
    {
      id: "c-nguyen", name: "Casey Nguyen", initials: "CN", color: "#8A6D3B",
      dob: "1979-02-27", status: "Discharged", assignedTherapist: "t-hayes",
      service: "svc-individual", payerType: "Self-Pay",
      riskFlag: false, riskNote: "",
      diagnoses: [], source: "Referral, booked 2025-11-10",
      nextAppointment: null,
      treatmentPlans: [
        { id: "tp-3", label: "Individual Therapy — Completed Plan", status: "Completed",
          targetDate: "2026-03-01", reviewDate: "2026-02-15",
          goals: [{ id: "g4", text: "Develop coping strategies for work stress", status: "Achieved", objectives: [] }] }
      ],
      assessments: [], notes: [], forms: [], documents: [], messages: [],
      consent: { status: "Signed", version: "v1", date: "2025-11-10" },
      billing: { balance: 0, invoices: [] }
    }
  ],

  // Today's date is fixed for the prototype so demo data reads coherently
  // regardless of when it's actually opened.
  today: "2026-08-13",

  appointments: [
    { id: "a1", clientId: "c-ellis", therapistId: "t-hayes", date: "2026-08-13", time: "09:00", endTime: "09:50",
      service: "svc-individual", format: "In-person", status: "Confirmed" },
    { id: "a2", clientId: "c-kim", therapistId: "t-hayes", date: "2026-08-13", time: "10:30", endTime: "11:30",
      service: "svc-couples", format: "Virtual", status: "Confirmed" },
    { id: "a3", clientId: "c-ellis", therapistId: "t-hayes", date: "2026-08-13", time: "14:00", endTime: "14:50",
      service: "svc-assessment", format: "In-person", status: "Pending" },
    { id: "a4", clientId: "c-reyes", therapistId: "t-okafor", date: "2026-08-13", time: "13:00", endTime: "14:00",
      service: "svc-family", format: "In-person", status: "Confirmed" },
    { id: "a5", clientId: "c-kim", therapistId: "t-hayes", date: "2026-08-14", time: "10:30", endTime: "11:30",
      service: "svc-couples", format: "Virtual", status: "Confirmed" },
    { id: "a6", clientId: "c-nguyen", therapistId: "t-hayes", date: "2026-08-11", time: "09:00", endTime: "09:50",
      service: "svc-individual", format: "In-person", status: "Completed" }
  ]
};

// Working copy helpers ------------------------------------------------------
CN.clone = function (obj) { return JSON.parse(JSON.stringify(obj)); };

CN.lookup = {
  service: function (id) { return CN.SEED.services.find(function (s) { return s.id === id; }); },
  therapist: function (id) { return CN.state.therapists.find(function (t) { return t.id === id; }); },
  client: function (id) { return CN.state.clients.find(function (c) { return c.id === id; }); },
  appointment: function (id) { return CN.state.appointments.find(function (a) { return a.id === id; }); }
};

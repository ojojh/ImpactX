let counter = 1000;
export const newId = () => ++counter;

export const db = {
  emails: [
    { id: 101, sender: "Photography Club President",
      subject: "New event proposal received: Campus Photo Walk & Exhibition",
      summary: "AI Summary: Requests auditorium foyer booking for Nov 18 and 15 student volunteers for exhibition setup.",
      time: "10 minutes ago", unread: true, important: true },
    { id: 102, sender: "PEC Dean Student Welfare Office",
      subject: "Annual Fest Budget & Security Clearance Deadline",
      summary: "AI Summary: Submit signed faculty advisor approval and volunteer roster by Friday 5:00 PM.",
      time: "2 hours ago", unread: true, important: true },
    { id: 103, sender: "IEEE & Robotics Chapter",
      subject: "Speaker Confirmation: Agentic AI Workshop",
      summary: "AI Summary: Guest speaker confirmed slot for Nov 19 at 3:00 PM. Needs projector and mic check.",
      time: "4 hours ago", unread: false, important: false },
  ],

  tasks: [
    { id: 201, title: "Volunteer list completed — Verify 45 registered student volunteers", category: "Annual Fest", status: "Completed" },
    { id: 202, title: "Send auditorium booking confirmation to Photography Club", category: "Photography Club", status: "Pending" },
    { id: 203, title: "Submit security clearance form to Dean Student Welfare", category: "Annual Fest", status: "Pending" },
    { id: 204, title: "Arrange AV & microphone setup for Agentic AI Workshop", category: "Workshop Planning", status: "Pending" },
    { id: 205, title: "Share reimbursement spreadsheet with club treasurer", category: "Finance & Admin", status: "Pending" },
  ],

  approvals: [
    { id: 301, title: "Schedule approval required: Agentic AI Workshop Room Booking",
      club: "Workshop Planning • 1 hour ago",
      actionDetail: "Agent drafted calendar invite for 120 members & Seminar Hall 2 reservation on Nov 18, 4:00 PM.",
      actionType: "other" },
    { id: 302, title: "Approve automated reply to Photography Club Proposal",
      club: "Photography Club • 10 minutes ago",
      actionDetail: "Agent prepared acceptance email with attached venue guidelines PDF.",
      actionType: "send_email" },
    { id: 303, title: "Confirm vendor catering order for NSS Blood Donation Drive",
      club: "NSS Unit • 3 hours ago",
      actionDetail: "Sensitive budget step: Requires coordinator sign-off for ₹8,500 refreshment order.",
      actionType: "spend_money" },
  ],

  events: [
    { title: "Agentic AI Hands-on Workshop", date: "Wednesday, Nov 18, 2026 • 4:00 PM", venue: "PEC Seminar Hall 2", tag: "Next event in 2 days" },
    { title: "Campus Photo Walk & Exhibition", date: "Friday, Nov 20, 2026 • 10:00 AM", venue: "Student Centre Plaza", tag: "Photography Club" },
    { title: "Annual Fest Core Committee Sync", date: "Saturday, Nov 21, 2026 • 11:30 AM", venue: "Club Workspace Room 104", tag: "Annual Fest" },
    { title: "NSS Community Cleanliness Drive", date: "Sunday, Nov 22, 2026 • 8:00 AM", venue: "Sector 12 Campus Gate", tag: "Humanity Initiative" },
    { title: "Hackathon Final Pitch Rehearsal", date: "Tuesday, Nov 24, 2026 • 5:00 PM", venue: "Auditorium", tag: "Team ImpactX" },
  ],

  activities: [
    { id: 1, title: "New event proposal received", subtitle: "Photography Club • 10 minutes ago", badge: "Inbox", targetTab: "inbox", iconType: "purple" },
    { id: 2, title: "Volunteer list completed", subtitle: "Annual Fest • 35 minutes ago", badge: "Tasks", targetTab: "tasks", iconType: "green" },
    { id: 3, title: "Schedule approval required", subtitle: "Workshop Planning • 1 hour ago", badge: "Review", targetTab: "approvals", iconType: "orange" },
  ],

  audit: [], // every agent or human action is recorded here
};

// ---------- helpers shared by the routes and the agent tools ----------

export function logActivity({ title, subtitle, badge, targetTab, iconType }) {
  db.activities.unshift({
    id: newId(), title, subtitle: subtitle ?? "Just now", badge, targetTab, iconType,
  });
  db.activities = db.activities.slice(0, 30);
}

export function audit(action, detail) {
  db.audit.unshift({ id: newId(), action, detail, at: new Date().toISOString() });
}

// The dashboard starts at 24 tasks and 12 unread emails, so the extra
// numbers below keep the KPI cards identical to your design.
export function getStats() {
  return {
    totalTasks: 19 + db.tasks.length,
    pendingApprovals: db.approvals.length,
    unreadEmails: 10 + db.emails.filter((e) => e.unread).length,
    upcomingEvents: db.events.length,
  };
}

export function createTask({ title, category }) {
  const task = { id: newId(), title, category: category || "General", status: "Pending" };
  db.tasks.unshift(task);
  logActivity({
    title: `Task created: ${title.slice(0, 40)}`,
    subtitle: `${task.category} • Just now`,
    badge: "Tasks", targetTab: "tasks", iconType: "green",
  });
  audit("create_task", title);
  return task;
}

export function queueApproval({ title, club, actionDetail, actionType, eventTitle, eventDate, venue }) {
  const item = {
    id: newId(), title,
    club: `${club || "General"} • Just now`,
    actionDetail: actionDetail || "Created for coordinator review.",
    actionType: actionType || "other",
    eventTitle, eventDate, venue,
  };
  db.approvals.unshift(item);
  logActivity({
    title, subtitle: `${club || "General"} • Just now`,
    badge: "Review", targetTab: "approvals", iconType: "orange",
  });
  audit("queue_approval", title);
  return item;
}

export function decideApproval(id, approve) {
  const idx = db.approvals.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const [item] = db.approvals.splice(idx, 1);

  // The action only runs AFTER a human approves it
  if (approve && item.actionType === "book_event" && item.eventTitle) {
    db.events.push({
      title: item.eventTitle,
      date: item.eventDate || "Date to be confirmed",
      venue: item.venue || "Venue to be confirmed",
      tag: "Approved by coordinator",
    });
  }

  logActivity({
    title: `${approve ? "Approved & Executed" : "Rejected"}: ${item.title}`,
    subtitle: "Human-in-the-loop log • Just now",
    badge: "Done", targetTab: "overview", iconType: approve ? "green" : "orange",
  });
  audit(approve ? "approved" : "rejected", item.title);
  return item;
}
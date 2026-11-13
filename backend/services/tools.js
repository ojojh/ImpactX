import { Type } from "@google/genai";
import { db, createTask, queueApproval } from "../data/store.js";

export const declarations = [
  {
    name: "get_emails",
    description: "List emails in the club inbox with sender, subject, AI summary, and unread/important flags.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        onlyUnread: { type: Type.BOOLEAN, description: "true to return only unread emails" },
      },
    },
  },
  {
    name: "get_events",
    description: "List upcoming club events with date and venue.",
  },
  {
    name: "get_tasks",
    description: "List club tasks.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: "Pending or Completed. Omit for all tasks." },
      },
    },
  },
  {
    name: "get_pending_approvals",
    description: "List actions currently waiting for the coordinator's approval.",
  },
  {
    name: "create_task",
    description: "Create a follow-up task in the club task tracker.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Short task description" },
        category: { type: Type.STRING, description: "Club or category, e.g. 'Annual Fest'" },
      },
      required: ["title"],
    },
  },
  {
    name: "request_approval",
    description:
      "Queue a SENSITIVE action for the human coordinator: sending an email or reply, booking a room, sending invites, creating calendar events, or spending money. The action is NOT executed until the human approves. Always use this instead of acting directly.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "One-line summary of the action" },
        club: { type: Type.STRING, description: "Club or category" },
        actionDetail: { type: Type.STRING, description: "Full details, e.g. the complete email draft or booking details" },
        actionType: { type: Type.STRING, enum: ["send_email", "book_event", "spend_money", "other"] },
        eventTitle: { type: Type.STRING, description: "Only for book_event" },
        eventDate: { type: Type.STRING, description: "Only for book_event, e.g. 'Wednesday, Nov 18, 2026 • 4:00 PM'" },
        venue: { type: Type.STRING, description: "Only for book_event" },
      },
      required: ["title", "club", "actionDetail", "actionType"],
    },
  },
];

export function runTool(name, args = {}) {
  switch (name) {
    case "get_emails":
      return db.emails.filter((e) => !args.onlyUnread || e.unread);

    case "get_events":
      return db.events;

    case "get_tasks":
      return db.tasks.filter((t) => !args.status || t.status === args.status);

    case "get_pending_approvals":
      return db.approvals;

    case "create_task": {
      if (!args.title) return { error: "title is required" };
      const task = createTask({ title: String(args.title), category: args.category });
      return { created: true, taskId: task.id };
    }

    case "request_approval": {
      if (!args.title) return { error: "title is required" };
      const item = queueApproval(args);
      return { queued: true, approvalId: item.id, note: "Waiting for human approval. Nothing was sent or booked." };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
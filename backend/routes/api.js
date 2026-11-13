import { Router } from "express";
import {
  db, getStats, createTask, queueApproval, decideApproval,
} from "../data/store.js";
import { runAgent } from "../services/agent.js";

const router = Router();

// Everything the dashboard needs in one call
router.get("/state", (req, res) => {
  res.json({
    emails: db.emails,
    tasks: db.tasks,
    approvals: db.approvals,
    events: db.events,
    activities: db.activities.slice(0, 10),
    stats: getStats(),
  });
});

// ----- Tasks -----
router.post("/tasks", (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  res.json(createTask({ title, category: String(req.body?.category ?? "").trim() }));
});

router.patch("/tasks/:id/toggle", (req, res) => {
  const task = db.tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: "Task not found" });
  task.status = task.status === "Completed" ? "Pending" : "Completed";
  res.json(task);
});

// ----- Emails -----
router.post("/emails/:id/extract-task", (req, res) => {
  const email = db.emails.find((e) => e.id === Number(req.params.id));
  if (!email) return res.status(404).json({ error: "Email not found" });
  res.json(createTask({ title: `Follow up: ${email.subject}`, category: email.sender }));
});

// ----- Approvals (human-in-the-loop) -----
router.post("/approvals", (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  res.json(queueApproval({
    title,
    club: String(req.body?.category ?? "").trim(),
    actionDetail: "Created manually by Workspace Admin for coordinator review.",
    actionType: "other",
  }));
});

router.post("/approvals/:id/decide", (req, res) => {
  const decision = req.body?.decision;
  if (decision !== "approve" && decision !== "reject") {
    return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
  }
  const item = decideApproval(Number(req.params.id), decision === "approve");
  if (!item) return res.status(404).json({ error: "Approval not found" });
  res.json({ ok: true, item });
});

// ----- AI agent -----
router.post("/agent", async (req, res) => {
  const command = String(req.body?.command ?? "").trim();
  if (!command) return res.status(400).json({ error: "command is required" });
  if (command.length > 500) return res.status(400).json({ error: "command is too long" });
  const result = await runAgent(command);
  res.json({ ...result, stats: getStats() });
});

// ----- Audit log (great to show judges) -----
router.get("/audit", (req, res) => res.json(db.audit));

export default router;
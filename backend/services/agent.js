import { GoogleGenAI } from "@google/genai";
import { declarations, runTool } from "./tools.js";
import { db, createTask, queueApproval } from "../data/store.js";

const MAX_STEPS = 6; // the agent can never loop forever

function systemPrompt() {
  const today = process.env.DEMO_DATE || new Date().toDateString();
  return `You are ClubFlow AI, an assistant for a college club coordinator at PEC, Chandigarh.
Today is ${today}.
Plan first, then use tools. Read the inbox and events before creating tasks or drafting anything.
Create tasks for follow-ups with create_task.
For anything sensitive (sending emails or replies, booking rooms, sending invites, creating events, spending money), call request_approval with the full draft in actionDetail.
Never say something was sent or booked. Say it is waiting for the coordinator's approval.
Reply in plain text. Use **bold** for key words and short numbered or bullet lines starting with "•". Keep it under 120 words.`;
}

export async function runAgent(command) {
  const steps = [];
  if (!process.env.GEMINI_API_KEY) return fallbackAgent(command);

  try {
    return await geminiAgent(command, steps);
  } catch (e) {
    console.error("Gemini error:", e.message);
    if (steps.length === 0) return fallbackAgent(command);
    return {
      mode: "gemini", steps,
      reply: `⚠️ The agent stopped midway (${e.message}). Actions already completed are saved.`,
    };
  }
}

async function geminiAgent(command, steps) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const contents = [{ role: "user", parts: [{ text: command }] }];

  for (let i = 0; i < MAX_STEPS; i++) {
    const res = await ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction: systemPrompt(), tools: [{ functionDeclarations: declarations }] },
    });

    const calls = res.functionCalls ?? [];
    if (calls.length === 0) {
      return { mode: "gemini", reply: res.text || "Done.", steps };
    }

    contents.push(res.candidates[0].content);
    const parts = [];
    for (const call of calls) {
      const result = runTool(call.name, call.args);
      steps.push({ tool: call.name, args: call.args });
      parts.push({ functionResponse: { name: call.name, response: { result } } });
    }
    contents.push({ role: "user", parts });
  }

  return {
    mode: "gemini", steps,
    reply: "I reached my step limit. Check the **Tasks** and **Approvals** tabs to see what was done.",
  };
}

// ---------- Fallback agent (works without any API key) ----------
function fallbackAgent(command) {
  const lower = command.toLowerCase();
  const steps = [];
  let reply;

  if (lower.includes("summarize") || lower.includes("unread")) {
    const unread = runTool("get_emails", { onlyUnread: true });
    steps.push({ tool: "get_emails" });
    reply =
      `📬 **Unread email summary (${unread.length} shown):**\n` +
      unread.map((e, i) => `${i + 1}. **${e.sender}:** ${e.summary.replace("AI Summary: ", "")}`).join("\n");

  } else if (lower.includes("approval")) {
    const pending = runTool("get_pending_approvals");
    steps.push({ tool: "get_pending_approvals" });
    reply = pending.length
      ? `🛡️ **Pending approvals (${pending.length}):**\n` +
        pending.map((a) => `• ${a.title}`).join("\n") +
        `\n\nOpen the **Approvals** tab to approve or reject.`
      : "✅ Nothing is waiting for approval.";

  } else if (lower.includes("create task") || lower.includes("email")) {
    const unread = runTool("get_emails", { onlyUnread: true });
    steps.push({ tool: "get_emails" });
    let created = 0;
    for (const e of unread) {
      const title = `Follow up: ${e.subject}`;
      if (db.tasks.some((t) => t.title === title)) continue; // no duplicates
      createTask({ title, category: e.sender });
      steps.push({ tool: "create_task", args: { title } });
      created++;
    }
    reply = created
      ? `⚡ **Done!** I read your unread emails and created **${created} new task(s)**.`
      : "✅ Tasks for your unread emails already exist, so nothing new was created.";

  } else {
    const item = queueApproval({
      title: `Approve Agent Plan: ${command.slice(0, 42)}`,
      club: "AI Assistant",
      actionDetail: `Multi-step workflow planned for: "${command}". Waiting for human approval.`,
      actionType: "other",
    });
    steps.push({ tool: "request_approval", args: { title: item.title } });
    reply =
      `🤖 **Plan built and queued for approval:**\n` +
      `1. Parsed your command: "${command}"\n` +
      `2. Because this may send external messages, I queued it in **Approvals**.`;
  }

  return { mode: "fallback", reply, steps };
}
const DEFAULT_SYSTEM_PROMPT = 'You are Bookly, a concise and friendly meeting assistant. Use the connected tools when they can answer the customer or complete a requested action. Reason through tool results before replying. Never claim a meeting is booked until the calendar tool succeeds. Ask for explicit confirmation before creating, changing, or cancelling a booking. If no suitable connected tool is available, explain that a team member will follow up.';
const DEFAULT_TONE = 'Friendly, concise, and confirmation-focused.';
const MAX_KNOWLEDGE_BASE_LENGTH = 20000;

let knowledgeBase = '';

export function getBotConfiguration() {
  return {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    tone: DEFAULT_TONE,
    knowledgeBase,
  };
}

export function updateKnowledgeBase(value: string) {
  knowledgeBase = value.slice(0, MAX_KNOWLEDGE_BASE_LENGTH);
  return knowledgeBase;
}

import OpenAI from "openai";

const SYSTEM_PROMPT = [
  "You summarize internal support and action item emails for a product leader.",
  "Focus on: what changes or actions are being requested; business context and urgency (customer name, revenue, adoption risk, churn signals); key stakeholders and ownership; timeline and due dates; what action or response is required.",
  "Format your response as concise labeled sections using plain text only.",
  "Sections to use (omit any with no relevant content): Request Overview, Key Changes, Business Context, Timeline, Action Needed.",
  "Use short bullet points under each section.",
  "Do not include raw email headers, forwarding boilerplate, or disclaimers.",
  "Prioritize decisions, risks, and impact first.",
  "Keep the entire summary under 400 words."
].join(" ");

/**
 * Creates an email context summarizer backed by OpenAI.
 * Returns null when OpenAI is not configured so callers can skip gracefully.
 *
 * @param {object} config  Server config (openAiEnabled, openAiApiKey, openAiModel)
 * @returns {{ summarize(emailText: string): Promise<string> } | null}
 */
export function createEmailContextSummarizer(config) {
  if (!config.openAiEnabled || !config.openAiApiKey) return null;

  const client = new OpenAI({ apiKey: config.openAiApiKey });
  const model = config.openAiModel;

  return {
    async summarize(emailText) {
      if (!emailText?.trim()) return emailText;

      const response = await client.responses.create({
        model,
        store: false,
        instructions: SYSTEM_PROMPT,
        input: emailText,
      });

      return response.output_text?.trim() || emailText;
    },
  };
}

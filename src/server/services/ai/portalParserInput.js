import { buildOpenAiPortalPayload } from "../portal/openAiPortalFields.js";

export function buildPortalParserInput(snapshot) {
  return JSON.stringify(buildOpenAiPortalPayload(snapshot?.records), null, 2);
}

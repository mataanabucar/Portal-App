import type { DashboardCardItem, ResearchReport } from "./types";

function clean(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parts(...items: (string | false | null | undefined)[]): string {
  return (items.filter(Boolean) as string[]).join("\n\n");
}

export function buildQueueItemTtsText(item: DashboardCardItem): string {
  return clean(
    parts(
      item.title + ".",
      item.status.label && `Status: ${item.status.label}.`,
      item.due.date && `Due date: ${item.due.date}.`,
      item.urgencyText && `Urgency: ${item.urgencyText}`,
      item.nextAction && `What to do now:\n${item.nextAction}`,
      item.deliverable && `Deliverable:\n${item.deliverable}`,
    )
  );
}

function labeledList(label: string, values: string[]): string | false {
  const cleanedValues = values.map((value) => clean(value)).filter(Boolean);
  return cleanedValues.length > 0 ? `${label}:\n${cleanedValues.join("\n")}` : false;
}

export function buildQueueItemVoiceReplayReport(item: DashboardCardItem): string {
  return clean(
    parts(
      "Full item summary card.",
      item.id && `Request ID: ${item.id}`,
      item.href && `Request link: ${item.href}`,
      item.title && `Title: ${item.title}`,
      item.source && `Source: ${item.source}`,
      item.cardKind && `Card type: ${item.cardKind}`,
      item.status?.label && `Status: ${item.status.label}`,
      item.priority?.label && `Priority: ${item.priority.label}`,
      item.due?.date && `Due date: ${item.due.date}`,
      item.due?.relative && `Due timing: ${item.due.relative}`,
      item.urgency && `Urgency level: ${item.urgency}`,
      item.urgencyText && `Urgency note: ${item.urgencyText}`,
      item.nextAction && `What to do now:\n${item.nextAction}`,
      item.summary && `Summary:\n${item.summary}`,
      item.deliverable && `Deliverable:\n${item.deliverable}`,
      item.confidence?.level && `Confidence: ${item.confidence.level}`,
      item.confidence?.reason && `Confidence reason: ${item.confidence.reason}`,
      labeledList("Blockers or open questions", item.blockersOpenQuestions),
      item.requestHistorySignals &&
        `Request history signals:\n${item.requestHistorySignals}`,
      item.keyDetails.length > 0 &&
        `Key details:\n${item.keyDetails
          .map((row) => `${row.label}: ${row.value}`)
          .join("\n")}`,
      item.footer?.requested && `Requested: ${item.footer.requested}`,
      item.footer?.lastUpdated && `Last updated: ${item.footer.lastUpdated}`,
      item.generatedAt && `AI generated at: ${item.generatedAt}`,
    )
  );
}

export function buildQuickTakeTtsText(report: ResearchReport): string {
  const { quickTake } = report;
  return clean(
    parts(
      "Quick Take.",
      quickTake.issue && `Issue: ${quickTake.issue}`,
      quickTake.whatWeKnow && `What we know: ${quickTake.whatWeKnow}`,
      quickTake.nextStep && `Next step: ${quickTake.nextStep}`,
    )
  );
}

export function buildOverviewTtsText(report: ResearchReport): string {
  return clean(
    parts(
      "Overview.",
      report.summaryOfIssue && `Summary of the issue:\n${report.summaryOfIssue}`,
      report.whatWeFound.length > 0 &&
        `What we found:\n${report.whatWeFound.join("\n")}`,
    )
  );
}

export function buildMissingInfoTtsText(report: ResearchReport): string {
  if (!report.whatIsMissing.length) return "No missing information flagged.";
  return clean(`What is missing:\n${report.whatIsMissing.join("\n")}`);
}

export function buildActionsTtsText(report: ResearchReport): string {
  if (!report.actionItems.length) return "No action items suggested.";
  const items = report.actionItems
    .map((a) => `${a.task}. Owner: ${a.owner}. Status: ${a.status}.`)
    .join("\n");
  return clean(`Action items:\n${items}`);
}

export function buildResearchVoiceReplayReport({
  item,
  report,
  sectionLabel,
  sectionText,
}: {
  item: DashboardCardItem;
  report: ResearchReport;
  sectionLabel: string;
  sectionText: string;
}): string {
  return clean(
    parts(
      `Research listen section: ${sectionLabel}`,
      sectionText && `Section content to summarize:\n${sectionText}`,
      "Full research card context.",
      report.quickTake?.issue && `Quick take issue: ${report.quickTake.issue}`,
      report.quickTake?.whatWeKnow &&
        `Quick take what we know: ${report.quickTake.whatWeKnow}`,
      report.quickTake?.nextStep &&
        `Quick take next step: ${report.quickTake.nextStep}`,
      report.summaryOfIssue &&
        `Research summary of issue:\n${report.summaryOfIssue}`,
      report.whatWeFound.length > 0 &&
        `What research found:\n${report.whatWeFound.join("\n")}`,
      report.whatIsMissing.length > 0 &&
        `Missing information:\n${report.whatIsMissing.join("\n")}`,
      report.recommendedSearches.length > 0 &&
        `Recommended next searches:\n${report.recommendedSearches.join("\n")}`,
      report.actionItems.length > 0 &&
        `Research action items:\n${report.actionItems
          .map((a) => `${a.task}. Owner: ${a.owner}. Status: ${a.status}.`)
          .join("\n")}`,
      report.confidence?.level &&
        `Research confidence: ${report.confidence.level}. ${report.confidence.reason}`,
      "Original portal item context.",
      buildQueueItemVoiceReplayReport(item),
    )
  );
}

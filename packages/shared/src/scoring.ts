import { DomainSummary, Issue, IssueSeverity } from "./types";

const WEIGHTS: Record<IssueSeverity, number> = {
  HIGH: 15,
  MEDIUM: 7,
  LOW: 3,
  REVIEW: 2,
};

export function scoreDomain(issues: Issue[], policyPagesFound: string[]): DomainSummary {
  const counts: Record<IssueSeverity, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    REVIEW: 0,
  };

  for (const issue of issues) {
    counts[issue.severity] += 1;
  }

  const totalPenalty = issues.reduce((sum, issue) => sum + WEIGHTS[issue.severity], 0);
  const score = Math.max(0, 100 - totalPenalty);

  const topIssues = [...issues]
    .sort((a, b) => WEIGHTS[b.severity] - WEIGHTS[a.severity])
    .slice(0, 10);

  return {
    score,
    topIssues,
    counts,
    policyPagesFound,
  };
}

import type { StudentEvaluationRow } from './evaluations.table';

type Scored = Pick<StudentEvaluationRow, 'overallRating' | 'skillRatings' | 'participation' | 'behavior' | 'parameters' | 'criteriaMetadata'>;

const PARTICIPATION: Record<string, number> = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
const GRADES: Record<string, number> = { A: 100, B: 80, C: 60, D: 40, F: 0 };

/** Mean of the five skill ratings, as the old "1.0"-style string. */
export function averageSkillRating(e: Pick<Scored, 'skillRatings'>): string {
  const s = e.skillRatings;
  return ((s.technicalSkills + s.problemSolving + s.creativity + s.teamwork + s.communication) / 5).toFixed(1);
}

/** Participation level on a 1–5 scale. */
export function participationScore(e: Pick<Scored, 'participation'>): number {
  return PARTICIPATION[e.participation.level] ?? 3;
}

/**
 * 0–100 score. Uses the weighted criteria parameters when the evaluation has a
 * criteria snapshot; otherwise the overall rating (when parameters were given)
 * or the original fixed formula.
 */
export function performanceScore(e: Scored): number {
  const config = e.criteriaMetadata?.parametersConfig;
  if (config) {
    let total = 0;
    let weight = 0;
    for (const p of config) {
      const value = e.parameters[p.name];
      if (value === undefined || value === null) continue;
      let normalized = 0;
      if (p.type === 'rating') {
        const min = p.ratingScale?.min ?? 1;
        const max = p.ratingScale?.max ?? 5;
        normalized = ((Number(value) - min) / (max - min)) * 100;
      } else if (p.type === 'percentage') normalized = Number(value);
      else if (p.type === 'boolean') normalized = value ? 100 : 0;
      else if (p.type === 'grade') normalized = GRADES[String(value)] ?? 0;
      total += normalized * ((p.weight ?? 0) / 100);
      weight += p.weight ?? 0;
    }
    if (weight > 0 && weight !== 100) total = (total / weight) * 100;
    return Math.round(Number.isFinite(total) ? total : 0);
  }
  if (Object.keys(e.parameters).length > 0) return Math.round((e.overallRating / 5) * 100);

  const rating = (e.overallRating / 5) * 30;
  const skills = (Number.parseFloat(averageSkillRating(e)) / 5) * 30;
  const participation = (participationScore(e) / 5) * 20;
  const behavior = ((e.behavior.focus || 3) / 5) * 20;
  return Math.round(rating + skills + participation + behavior);
}

export function needsReview(e: Pick<StudentEvaluationRow, 'needsAttention' | 'atRisk' | 'overallRating' | 'attendance'>): boolean {
  return e.needsAttention || e.atRisk || e.overallRating <= 2 || e.attendance.status === 'absent';
}

type Flagged = Pick<StudentEvaluationRow, 'overallRating' | 'skillRatings' | 'comprehension' | 'behavior' | 'attendance' | 'needsAttention' | 'atRisk' | 'excelling'>;

/** The flags raised automatically on every save. They are only ever turned on here, never off. */
export function autoFlags(e: Flagged): Pick<StudentEvaluationRow, 'needsAttention' | 'atRisk' | 'excelling'> {
  let { needsAttention, atRisk, excelling } = e;
  if (e.overallRating <= 2) atRisk = true;
  if (e.comprehension.level === 'struggling') needsAttention = true;
  if (e.behavior.attitude === 'negative' || e.behavior.focus <= 2) needsAttention = true;
  if (e.attendance.status === 'absent') needsAttention = true;
  if (e.overallRating >= 5 && Number.parseFloat(averageSkillRating(e)) >= 4.5) excelling = true;
  return { needsAttention, atRisk, excelling };
}

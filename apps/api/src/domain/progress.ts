import { METRIC_LABELS, type MetricType, type ProgressSummary } from "@pulse/shared";
import type { Store } from "../store/store";
import { listMyParticipations } from "./challenges";

/** Indicateurs fournis par HAC-DATA-001 et affichés tels quels (valeur absente => état vide, RG-PROG-03). */
const DISPLAYED_METRICS: MetricType[] = ["WEEKLY_ACTIVE_DAYS", "STREAK_DAYS", "WELLBEING_CHECKINS", "HYDRATION_DAYS"];

/** RG-PROG-01..04 : synthèse strictement personnelle, sans classement ni comparaison. */
export function getProgressSummary(store: Store, userId: string): ProgressSummary {
  const data = store.read();
  const myMetrics = data.metrics.filter((m) => m.userId === userId);
  const latest = [...myMetrics].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
  const inPeriod = latest ? myMetrics.filter((m) => m.periodEnd === latest.periodEnd) : [];

  const goals = data.goals.filter((g) => g.userId === userId);
  const participations = listMyParticipations(store, userId).filter((x) => x.participation.status === "ACTIVE");

  return {
    period: latest ? { start: latest.periodStart, end: latest.periodEnd } : null,
    metrics: DISPLAYED_METRICS.map((metricType) => {
      const m = inPeriod.find((x) => x.metricType === metricType);
      return { metricType, label: m?.label ?? METRIC_LABELS[metricType], value: m?.value ?? null, unit: m?.unit ?? null };
    }),
    goals: {
      active: goals.filter((g) => g.status === "ACTIVE").length,
      suspended: goals.filter((g) => g.status === "SUSPENDED").length,
      closed: goals.filter((g) => g.status === "CLOSED").length,
      items: goals.filter((g) => g.status === "ACTIVE"),
    },
    challenges: { active: participations.length, items: participations },
  };
}

import type { InquiryEvent } from "./types";

export interface RoiInputs {
  costPerInquiryCNY: number;
  avgOrderValueUSD: number;
  conversionLiftRate: number;
  usdToCny: number;
  monthlySubscriptionCNY: number;
}

export const DEFAULT_ROI_INPUTS: RoiInputs = {
  costPerInquiryCNY: 30,
  avgOrderValueUSD: 50000,
  conversionLiftRate: 0.05,
  usdToCny: 7.2,
  monthlySubscriptionCNY: 5000,
};

export interface RoiSnapshot {
  inquiriesProcessed: number;
  inquiriesAutoSent: number;
  inquiriesReview: number;
  inquiriesHuman: number;
  blindSpotInquiries: number;
  blindSpotConverted: number;
  avgFirstResponseSeconds: number;
  followUpCoverageRate: number;
  laborSavingsCNY: number;
  recoveredLeadValueCNY: number;
  efficiencyValueCNY: number;
  totalMonthlyValueCNY: number;
  netMonthlyValueCNY: number;
  paybackMonths: number;
  inputs: RoiInputs;
}

export function computeRoi(
  events: InquiryEvent[],
  inputs: RoiInputs = DEFAULT_ROI_INPUTS,
): RoiSnapshot {
  const business = events.filter((e) => e.isBusiness);
  const auto = business.filter((e) => e.route === "auto_send");
  const review = business.filter((e) => e.route === "review");
  const human = business.filter((e) => e.route === "human");
  const blindSpot = business.filter((e) => e.isBlindSpotHour);
  const blindSpotConverted = blindSpot.filter((e) => e.customerReply);

  const responseTimesSec = business.map((e) => {
    if (e.route === "auto_send") return Math.max(15, Math.round(e.durationMs / 1000));
    if (e.route === "review") return 30 * 60;
    return 4 * 3600;
  });
  const avgFirstResponseSeconds = responseTimesSec.length
    ? Math.round(responseTimesSec.reduce((a, b) => a + b, 0) / responseTimesSec.length)
    : 0;

  const withFollowUp = business.filter((e) => e.followUp || e.customerReply);
  const followUpCoverageRate = business.length
    ? Math.round((withFollowUp.length / business.length) * 100) / 100
    : 0;

  const laborSavingsCNY = business.length * inputs.costPerInquiryCNY;
  const recoveredLeadValueCNY = Math.round(
    blindSpotConverted.length *
      inputs.avgOrderValueUSD *
      inputs.conversionLiftRate *
      inputs.usdToCny,
  );

  const humanResponseSec = 24 * 3600;
  const timeSavedSec = business.reduce((acc, e, i) => acc + Math.max(0, humanResponseSec - responseTimesSec[i]), 0);
  const efficiencyValueCNY = Math.round((timeSavedSec / 3600) * 8);

  const totalMonthlyValueCNY = laborSavingsCNY + recoveredLeadValueCNY + efficiencyValueCNY;
  const netMonthlyValueCNY = totalMonthlyValueCNY - inputs.monthlySubscriptionCNY;
  const paybackMonths =
    netMonthlyValueCNY > 0
      ? Number((inputs.monthlySubscriptionCNY / netMonthlyValueCNY).toFixed(2))
      : Number.POSITIVE_INFINITY;

  return {
    inquiriesProcessed: business.length,
    inquiriesAutoSent: auto.length,
    inquiriesReview: review.length,
    inquiriesHuman: human.length,
    blindSpotInquiries: blindSpot.length,
    blindSpotConverted: blindSpotConverted.length,
    avgFirstResponseSeconds,
    followUpCoverageRate,
    laborSavingsCNY,
    recoveredLeadValueCNY,
    efficiencyValueCNY,
    totalMonthlyValueCNY,
    netMonthlyValueCNY,
    paybackMonths,
    inputs,
  };
}

export function fmtCNY(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 10000) return `¥${(n / 10000).toFixed(1)}w`;
  return `¥${n.toLocaleString("zh-CN")}`;
}

export function fmtSeconds(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}min`;
  return `${(sec / 3600).toFixed(1)}h`;
}

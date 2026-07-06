export type PropertyFinancialInputs = {
  tokenNumber: number;
  tokenPrice: number;

  purchasePrice?: number | null;
  notaryFeesPct?: number | null;
  agencyFeesPct?: number | null;
  diagnosticFees?: number | null;
  renovationCost?: number | null;
  furnitureCost?: number | null;

  platformEquity?: number | null;
  loanAmount?: number | null;
  loanRatePct?: number | null;
  loanDurationYears?: number | null;

  monthlyRent?: number | null;
  occupancyRatePct?: number | null;

  nonRecoverableCharges?: number | null;
  propertyTax?: number | null;
  insurancePnoAnnual?: number | null;
  insuranceGliPct?: number | null;
  managementFeePct?: number | null;
  maintenanceProvisionPct?: number | null;
  majorRepairsProvisionPct?: number | null;

  platformAnnualFeePct?: number | null;
  exitFeePct?: number | null;
  rentDistributionCommissionPct?: number | null;

  holdingPeriodYears?: number | null;
  exitAppreciationPct?: number | null;
  resaleFeesPct?: number | null;
};

export type PropertyFinancialSummary = {
  totalAcquisitionCost: number;
  amountRaised: number;
  suggestedTokenPrice: number | null;
  grossAnnualRent: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  annualDebtService: number;
  distributableCashFlow: number;
  perTokenMonthlyIncome: number;
  perTokenAnnualIncome: number;
  grossYieldPct: number | null;
  netYieldPct: number | null;
  cashOnCashPct: number | null;
  investorAnnualYieldBps: number | null;
  exitValue: number | null;
  netExitProceedsPerToken: number | null;
  moic: number | null;
  paybackYears: number | null;
};

function ratio(percent: number | null | undefined) {
  return (percent ?? 0) / 100;
}

function annualDebtService(
  loanAmount: number,
  loanRatePct: number | null | undefined,
  loanDurationYears: number | null | undefined,
) {
  if (loanAmount <= 0 || !loanDurationYears || loanDurationYears <= 0) {
    return 0;
  }

  if (!loanRatePct || loanRatePct <= 0) {
    return loanAmount / loanDurationYears;
  }

  const monthlyRate = ratio(loanRatePct) / 12;
  const monthCount = loanDurationYears * 12;
  const monthlyPayment =
    (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -monthCount));

  return monthlyPayment * 12;
}

export function computePropertyFinancials(
  input: PropertyFinancialInputs,
): PropertyFinancialSummary | null {
  if (!input.purchasePrice || input.purchasePrice <= 0) {
    return null;
  }

  const notaryFees = input.purchasePrice * ratio(input.notaryFeesPct);
  const agencyFees = input.purchasePrice * ratio(input.agencyFeesPct);
  const totalAcquisitionCost = Math.round(
    input.purchasePrice +
      notaryFees +
      agencyFees +
      (input.diagnosticFees ?? 0) +
      (input.renovationCost ?? 0) +
      (input.furnitureCost ?? 0),
  );

  const loanAmount = input.loanAmount ?? 0;
  const amountRaised = Math.max(
    0,
    Math.round(totalAcquisitionCost - (input.platformEquity ?? 0) - loanAmount),
  );
  const suggestedTokenPrice =
    input.tokenNumber > 0 ? Math.round(amountRaised / input.tokenNumber) : null;

  const occupancyRate =
    input.occupancyRatePct == null ? 1 : ratio(input.occupancyRatePct);
  const grossAnnualRent = Math.round(
    (input.monthlyRent ?? 0) * 12 * occupancyRate,
  );

  const operatingExpenses = Math.round(
    (input.nonRecoverableCharges ?? 0) +
      (input.propertyTax ?? 0) +
      (input.insurancePnoAnnual ?? 0) +
      grossAnnualRent * ratio(input.insuranceGliPct) +
      grossAnnualRent * ratio(input.managementFeePct) +
      grossAnnualRent * ratio(input.maintenanceProvisionPct) +
      grossAnnualRent * ratio(input.majorRepairsProvisionPct),
  );

  const netOperatingIncome = grossAnnualRent - operatingExpenses;
  const debtService = Math.round(
    annualDebtService(loanAmount, input.loanRatePct, input.loanDurationYears),
  );

  const distributableCashFlow = Math.round(
    netOperatingIncome -
      debtService -
      amountRaised * ratio(input.platformAnnualFeePct) -
      netOperatingIncome * ratio(input.rentDistributionCommissionPct),
  );

  const perTokenAnnualIncome =
    input.tokenNumber > 0
      ? Math.round(distributableCashFlow / input.tokenNumber)
      : 0;
  const perTokenMonthlyIncome = Math.round(perTokenAnnualIncome / 12);

  const grossYieldPct =
    input.purchasePrice > 0
      ? (grossAnnualRent / input.purchasePrice) * 100
      : null;
  const netYieldPct =
    totalAcquisitionCost > 0
      ? (netOperatingIncome / totalAcquisitionCost) * 100
      : null;
  const cashOnCashPct =
    amountRaised > 0 ? (distributableCashFlow / amountRaised) * 100 : null;
  const investorAnnualYieldBps =
    cashOnCashPct != null ? Math.round(cashOnCashPct * 100) : null;

  let exitValue: number | null = null;
  let netExitProceedsPerToken: number | null = null;
  let moic: number | null = null;
  let paybackYears: number | null = null;

  if (input.holdingPeriodYears && input.holdingPeriodYears > 0) {
    exitValue = Math.round(
      input.purchasePrice *
        Math.pow(
          1 + ratio(input.exitAppreciationPct),
          input.holdingPeriodYears,
        ),
    );

    const remainingLoanBalance =
      loanAmount > 0 && input.loanDurationYears
        ? Math.max(
            0,
            loanAmount *
              (1 -
                Math.min(input.holdingPeriodYears, input.loanDurationYears) /
                  input.loanDurationYears),
          )
        : 0;

    const netExitProceeds =
      exitValue * (1 - ratio(input.resaleFeesPct)) - remainingLoanBalance;
    const netExitProceedsAfterFee =
      netExitProceeds * (1 - ratio(input.exitFeePct));

    netExitProceedsPerToken =
      input.tokenNumber > 0
        ? Math.round(netExitProceedsAfterFee / input.tokenNumber)
        : null;

    if (input.tokenPrice > 0) {
      const cumulativeDistributionsPerToken =
        perTokenAnnualIncome * input.holdingPeriodYears;
      moic =
        (cumulativeDistributionsPerToken + (netExitProceedsPerToken ?? 0)) /
        input.tokenPrice;
    }
  }

  if (input.tokenPrice > 0 && perTokenAnnualIncome > 0) {
    paybackYears = input.tokenPrice / perTokenAnnualIncome;
  }

  return {
    totalAcquisitionCost,
    amountRaised,
    suggestedTokenPrice,
    grossAnnualRent,
    operatingExpenses,
    netOperatingIncome,
    annualDebtService: debtService,
    distributableCashFlow,
    perTokenMonthlyIncome,
    perTokenAnnualIncome,
    grossYieldPct,
    netYieldPct,
    cashOnCashPct,
    investorAnnualYieldBps,
    exitValue,
    netExitProceedsPerToken,
    moic,
    paybackYears,
  };
}

export type PropertyScoreInputs = PropertyFinancialInputs & {
  subscriptionFeePct?: number | null;
};

const DEFAULT_SCORE_WITHOUT_FINANCIALS = 50;

function clampToRange(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, max: number) {
  return clampToRange((value / max) * 100, 0, 100);
}

/**
 * Score de rentabilité/attractivité du bien sur 100, calculé à partir de
 * l'ensemble des variables financières plutôt que saisi manuellement :
 * rendement net (30%), cash-on-cash (25%), occupation (15%), multiple à la
 * sortie/MOIC (15%) et charge de frais plateforme/gestion (15%, inversé :
 * moins de frais = meilleur score).
 */
export function computePropertyScore(input: PropertyScoreInputs): number {
  const financials = computePropertyFinancials(input);

  if (!financials) {
    return DEFAULT_SCORE_WITHOUT_FINANCIALS;
  }

  const netYieldScore = normalize(financials.netYieldPct ?? 0, 8);
  const cashOnCashScore = normalize(financials.cashOnCashPct ?? 0, 10);
  const occupancyScore = clampToRange(input.occupancyRatePct ?? 100, 0, 100);
  const moicScore =
    financials.moic != null
      ? normalize(financials.moic - 1, 2)
      : DEFAULT_SCORE_WITHOUT_FINANCIALS;

  const totalFeesPct =
    (input.platformAnnualFeePct ?? 0) +
    (input.managementFeePct ?? 0) +
    (input.subscriptionFeePct ?? 0) +
    (input.exitFeePct ?? 0);
  const feeScore = clampToRange(100 - normalize(totalFeesPct, 15), 0, 100);

  const score =
    netYieldScore * 0.3 +
    cashOnCashScore * 0.25 +
    occupancyScore * 0.15 +
    moicScore * 0.15 +
    feeScore * 0.15;

  return Math.round(clampToRange(score, 0, 100));
}

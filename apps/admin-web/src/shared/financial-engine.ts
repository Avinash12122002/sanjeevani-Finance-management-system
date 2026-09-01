import Decimal from 'decimal.js';

// Configure Decimal precision for banking (precision 28, rounding half-up / banker's)
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface EmiCalculationRequest {
  principal: number | string;
  annualInterestRate: number | string; // in percentage e.g. 12 for 12%
  tenureMonths: number;
  interestMethod: 'FLAT_RATE' | 'REDUCING_BALANCE' | 'CUSTOM_SCHEDULE';
  startDate?: string; // YYYY-MM-DD
}

export interface EmiScheduleItem {
  installmentNumber: number;
  dueDate: string;
  openingPrincipal: number;
  principalDue: number;
  interestDue: number;
  feeDue: number;
  penaltyDue: number;
  totalDue: number;
  closingPrincipal: number;
}

export interface EmiCalculationResult {
  emiAmount: number;
  totalPayable: number;
  totalInterest: number;
  schedule: EmiScheduleItem[];
}

export class FinancialEngine {
  /**
   * Safe financial addition using Decimal.js
   */
  static add(a: number | string, b: number | string): number {
    return new Decimal(a).plus(new Decimal(b)).toDecimalPlaces(2).toNumber();
  }

  /**
   * Safe financial subtraction using Decimal.js
   */
  static subtract(a: number | string, b: number | string): number {
    return new Decimal(a).minus(new Decimal(b)).toDecimalPlaces(2).toNumber();
  }

  /**
   * Safe financial multiplication
   */
  static multiply(a: number | string, b: number | string): number {
    return new Decimal(a).times(new Decimal(b)).toDecimalPlaces(2).toNumber();
  }

  /**
   * Safe financial division
   */
  static divide(a: number | string, b: number | string): number {
    if (new Decimal(b).isZero()) {
      throw new Error('Division by zero in financial engine');
    }
    return new Decimal(a).dividedBy(new Decimal(b)).toDecimalPlaces(2).toNumber();
  }

  /**
   * Calculates monthly EMI for Reducing Balance or Flat Rate loans (SRS §26)
   * Formula for Reducing Balance:
   * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
   * where P = principal, r = monthly interest (annual / 12 / 100), n = months
   */
  static calculateLoanEmi(req: EmiCalculationRequest): EmiCalculationResult {
    const P = new Decimal(req.principal);
    const n = new Decimal(req.tenureMonths);
    const annualRate = new Decimal(req.annualInterestRate);
    const monthlyRate = annualRate.dividedBy(12).dividedBy(100);

    let emi = new Decimal(0);
    let totalInterest = new Decimal(0);
    let totalPayable = new Decimal(0);
    const schedule: EmiScheduleItem[] = [];

    const baseDate = req.startDate ? new Date(req.startDate) : new Date();

    if (req.interestMethod === 'REDUCING_BALANCE') {
      if (monthlyRate.isZero()) {
        emi = P.dividedBy(n).toDecimalPlaces(2);
        totalInterest = new Decimal(0);
        totalPayable = P;
      } else {
        // (1+r)^n
        const onePlusRToN = monthlyRate.plus(1).pow(n.toNumber());
        // numerator = P * r * (1+r)^n
        const numerator = P.times(monthlyRate).times(onePlusRToN);
        // denominator = (1+r)^n - 1
        const denominator = onePlusRToN.minus(1);
        emi = numerator.dividedBy(denominator).toDecimalPlaces(2);
      }

      let currentPrincipal = P;

      for (let i = 1; i <= req.tenureMonths; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        const interestForMonth = currentPrincipal.times(monthlyRate).toDecimalPlaces(2);
        let principalForMonth = emi.minus(interestForMonth).toDecimalPlaces(2);

        // Adjust rounding on the final installment
        if (i === req.tenureMonths || principalForMonth.greaterThan(currentPrincipal)) {
          principalForMonth = currentPrincipal;
          emi = principalForMonth.plus(interestForMonth).toDecimalPlaces(2);
        }

        const closingPrincipal = currentPrincipal.minus(principalForMonth).toDecimalPlaces(2);
        totalInterest = totalInterest.plus(interestForMonth);

        schedule.push({
          installmentNumber: i,
          dueDate: dueDate.toISOString().split('T')[0],
          openingPrincipal: currentPrincipal.toNumber(),
          principalDue: principalForMonth.toNumber(),
          interestDue: interestForMonth.toNumber(),
          feeDue: 0,
          penaltyDue: 0,
          totalDue: principalForMonth.plus(interestForMonth).toNumber(),
          closingPrincipal: Decimal.max(0, closingPrincipal).toNumber(),
        });

        currentPrincipal = closingPrincipal;
      }

      totalPayable = P.plus(totalInterest).toDecimalPlaces(2);
    } else {
      // FLAT_RATE method
      // Total Interest = P * (annualRate/100) * (n/12)
      totalInterest = P.times(annualRate.dividedBy(100)).times(n.dividedBy(12)).toDecimalPlaces(2);
      totalPayable = P.plus(totalInterest);
      emi = totalPayable.dividedBy(n).toDecimalPlaces(2);

      const principalPerMonth = P.dividedBy(n).toDecimalPlaces(2);
      const interestPerMonth = totalInterest.dividedBy(n).toDecimalPlaces(2);
      let currentPrincipal = P;

      for (let i = 1; i <= req.tenureMonths; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        let pDue = principalPerMonth;
        let iDue = interestPerMonth;

        if (i === req.tenureMonths) {
          pDue = currentPrincipal;
        }

        const closingPrincipal = currentPrincipal.minus(pDue).toDecimalPlaces(2);

        schedule.push({
          installmentNumber: i,
          dueDate: dueDate.toISOString().split('T')[0],
          openingPrincipal: currentPrincipal.toNumber(),
          principalDue: pDue.toNumber(),
          interestDue: iDue.toNumber(),
          feeDue: 0,
          penaltyDue: 0,
          totalDue: pDue.plus(iDue).toNumber(),
          closingPrincipal: Decimal.max(0, closingPrincipal).toNumber(),
        });

        currentPrincipal = closingPrincipal;
      }
    }

    return {
      emiAmount: emi.toNumber(),
      totalPayable: totalPayable.toNumber(),
      totalInterest: totalInterest.toNumber(),
      schedule,
    };
  }

  /**
   * Recurring Deposit (RD) Maturity Calculator (SRS §19)
   * Formula: M = R * [(1+i)^n - 1] / (1 - (1+i)^(-1/3)) or quarterly compounded
   */
  static calculateRDMaturity(
    monthlyDeposit: number | string,
    annualRate: number | string,
    tenureMonths: number,
  ): { totalInvested: number; maturityAmount: number; totalInterest: number } {
    const R = new Decimal(monthlyDeposit);
    const n = new Decimal(tenureMonths);
    const totalInvested = R.times(n).toDecimalPlaces(2);

    const r = new Decimal(annualRate).dividedBy(100);
    // Standard RD simple compounding approximation:
    // Interest = R * (n * (n+1) / 2) * (r / 12)
    const sumMonths = n.times(n.plus(1)).dividedBy(2);
    const interest = R.times(sumMonths).times(r.dividedBy(12)).toDecimalPlaces(2);
    const maturityAmount = totalInvested.plus(interest).toDecimalPlaces(2);

    return {
      totalInvested: totalInvested.toNumber(),
      maturityAmount: maturityAmount.toNumber(),
      totalInterest: interest.toNumber(),
    };
  }

  /**
   * Term Deposit (Fixed Deposit) Maturity Calculator (SRS §21)
   * Compound Quarterly: A = P * (1 + r/4)^(4 * t)
   */
  static calculateTermDepositMaturity(
    principal: number | string,
    annualRate: number | string,
    tenureMonths: number,
  ): { principal: number; maturityAmount: number; interestEarned: number } {
    const P = new Decimal(principal);
    const r = new Decimal(annualRate).dividedBy(100);
    const t = new Decimal(tenureMonths).dividedBy(12);

    // Quarterly compounding (4 times a year)
    const n = 4;
    const base = new Decimal(1).plus(r.dividedBy(n));
    const exponent = new Decimal(n).times(t);
    const maturityAmount = P.times(base.pow(exponent.toNumber())).toDecimalPlaces(2);
    const interestEarned = maturityAmount.minus(P).toDecimalPlaces(2);

    return {
      principal: P.toNumber(),
      maturityAmount: maturityAmount.toNumber(),
      interestEarned: interestEarned.toNumber(),
    };
  }

  /**
   * Validates that Double-Entry Journal lines strictly balance (SRS §41, BR-016)
   * SUM(DEBIT) === SUM(CREDIT)
   */
  static validateJournalBalance(lines: { debitAmount: number; creditAmount: number }[]): {
    isValid: boolean;
    totalDebit: number;
    totalCredit: number;
    difference: number;
  } {
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const line of lines) {
      totalDebit = totalDebit.plus(new Decimal(line.debitAmount || 0));
      totalCredit = totalCredit.plus(new Decimal(line.creditAmount || 0));
    }

    totalDebit = totalDebit.toDecimalPlaces(2);
    totalCredit = totalCredit.toDecimalPlaces(2);
    const difference = totalDebit.minus(totalCredit).abs().toDecimalPlaces(2);

    return {
      isValid: difference.isZero(),
      totalDebit: totalDebit.toNumber(),
      totalCredit: totalCredit.toNumber(),
      difference: difference.toNumber(),
    };
  }

  /**
   * Formats Indian Rupee (INR) with Indian numbering format (e.g. ₹ 1,25,000.00)
   */
  static formatINR(amount: number | string): string {
    const num = new Decimal(amount || 0).toDecimalPlaces(2);
    const parts = num.toFixed(2).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    const isNegative = integerPart.startsWith('-');
    if (isNegative) integerPart = integerPart.substring(1);

    let lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    const formattedInteger =
      otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

    return `${isNegative ? '-' : ''}₹ ${formattedInteger}.${decimalPart}`;
  }
}

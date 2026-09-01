export interface EmiCalculationRequest {
    principal: number | string;
    annualInterestRate: number | string;
    tenureMonths: number;
    interestMethod: 'FLAT_RATE' | 'REDUCING_BALANCE' | 'CUSTOM_SCHEDULE';
    startDate?: string;
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
export declare class FinancialEngine {
    /**
     * Safe financial addition using Decimal.js
     */
    static add(a: number | string, b: number | string): number;
    /**
     * Safe financial subtraction using Decimal.js
     */
    static subtract(a: number | string, b: number | string): number;
    /**
     * Safe financial multiplication
     */
    static multiply(a: number | string, b: number | string): number;
    /**
     * Safe financial division
     */
    static divide(a: number | string, b: number | string): number;
    /**
     * Calculates monthly EMI for Reducing Balance or Flat Rate loans (SRS §26)
     * Formula for Reducing Balance:
     * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
     * where P = principal, r = monthly interest (annual / 12 / 100), n = months
     */
    static calculateLoanEmi(req: EmiCalculationRequest): EmiCalculationResult;
    /**
     * Recurring Deposit (RD) Maturity Calculator (SRS §19)
     * Formula: M = R * [(1+i)^n - 1] / (1 - (1+i)^(-1/3)) or quarterly compounded
     */
    static calculateRDMaturity(monthlyDeposit: number | string, annualRate: number | string, tenureMonths: number): {
        totalInvested: number;
        maturityAmount: number;
        totalInterest: number;
    };
    /**
     * Term Deposit (Fixed Deposit) Maturity Calculator (SRS §21)
     * Compound Quarterly: A = P * (1 + r/4)^(4 * t)
     */
    static calculateTermDepositMaturity(principal: number | string, annualRate: number | string, tenureMonths: number): {
        principal: number;
        maturityAmount: number;
        interestEarned: number;
    };
    /**
     * Validates that Double-Entry Journal lines strictly balance (SRS §41, BR-016)
     * SUM(DEBIT) === SUM(CREDIT)
     */
    static validateJournalBalance(lines: {
        debitAmount: number;
        creditAmount: number;
    }[]): {
        isValid: boolean;
        totalDebit: number;
        totalCredit: number;
        difference: number;
    };
    /**
     * Formats Indian Rupee (INR) with Indian numbering format (e.g. ₹ 1,25,000.00)
     */
    static formatINR(amount: number | string): string;
}

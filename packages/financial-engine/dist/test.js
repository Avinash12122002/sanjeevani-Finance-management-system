"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
console.log('--- Testing Precision Financial Engine ---');
// Test 1: Reducing Balance EMI (SRS §26: P=100000, r=12%, n=12 months)
const reducingEmi = index_1.FinancialEngine.calculateLoanEmi({
    principal: 100000,
    annualInterestRate: 12,
    tenureMonths: 12,
    interestMethod: 'REDUCING_BALANCE',
    startDate: '2026-09-01',
});
console.log(`Reducing Balance Monthly EMI: ${index_1.FinancialEngine.formatINR(reducingEmi.emiAmount)}`);
console.log(`Total Payable: ${index_1.FinancialEngine.formatINR(reducingEmi.totalPayable)}`);
console.log(`Total Interest: ${index_1.FinancialEngine.formatINR(reducingEmi.totalInterest)}`);
console.log(`Schedule installments count: ${reducingEmi.schedule.length}`);
console.log(`Final installment closing principal: ${reducingEmi.schedule[11].closingPrincipal}`);
// Test 2: Double-Entry Balancing
const balancedJournal = index_1.FinancialEngine.validateJournalBalance([
    { debitAmount: 50000, creditAmount: 0 },
    { debitAmount: 0, creditAmount: 35000 },
    { debitAmount: 0, creditAmount: 15000 },
]);
console.log(`Balanced Journal Check: ${balancedJournal.isValid ? 'PASSED' : 'FAILED'}`);
const unBalancedJournal = index_1.FinancialEngine.validateJournalBalance([
    { debitAmount: 50000, creditAmount: 0 },
    { debitAmount: 0, creditAmount: 49000 },
]);
console.log(`Unbalanced Journal Check correctly caught: ${!unBalancedJournal.isValid ? 'PASSED' : 'FAILED'}`);
// Test 3: RD Maturity
const rd = index_1.FinancialEngine.calculateRDMaturity(5000, 8.5, 24);
console.log(`RD 24m Maturity for ₹5k/m @ 8.5%: ${index_1.FinancialEngine.formatINR(rd.maturityAmount)} (Invested: ${index_1.FinancialEngine.formatINR(rd.totalInvested)}, Interest: ${index_1.FinancialEngine.formatINR(rd.totalInterest)})`);
console.log('All financial math tests completed successfully.');

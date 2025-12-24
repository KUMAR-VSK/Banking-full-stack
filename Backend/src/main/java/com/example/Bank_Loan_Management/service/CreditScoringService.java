package com.example.Bank_Loan_Management.service;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;

@Service
public class CreditScoringService {

    public int calculateCreditScore(BigDecimal amount, Integer term, String purpose) {
        // Simple mock credit scoring logic
        // In a real application, this would involve external APIs, user history, etc.

        int baseScore = 500; // Minimum score

        // Amount factor: higher amount reduces score
        if (amount.compareTo(BigDecimal.valueOf(10000)) > 0) {
            baseScore -= 50;
        } else if (amount.compareTo(BigDecimal.valueOf(5000)) > 0) {
            baseScore -= 25;
        }

        // Term factor: longer term increases score slightly
        if (term > 24) {
            baseScore += 20;
        } else if (term > 12) {
            baseScore += 10;
        }

        // Purpose factor: some purposes are riskier
        if ("business".equalsIgnoreCase(purpose)) {
            baseScore -= 30;
        } else if ("personal".equalsIgnoreCase(purpose)) {
            baseScore += 10;
        }

        // Ensure score is between 300 and 850
        return Math.max(300, Math.min(850, baseScore));
    }

    public boolean isEligible(int creditScore, BigDecimal amount) {
        // Simple eligibility: score > 400 and amount < 50000
        return creditScore > 400 && amount.compareTo(BigDecimal.valueOf(50000)) < 0;
    }

    public BigDecimal getInterestRate(String purpose) {
        switch (purpose.toLowerCase()) {
            case "housing": return BigDecimal.valueOf(5.0);
            case "education": return BigDecimal.valueOf(4.0);
            case "personal": return BigDecimal.valueOf(9.0);
            case "health": return BigDecimal.valueOf(7.0);
            case "professional": return BigDecimal.valueOf(8.0);
            case "car": return BigDecimal.valueOf(6.0);
            default: return BigDecimal.valueOf(10.0);
        }
    }
}

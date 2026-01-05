package com.example.Bank_Loan_Management.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.example.Bank_Loan_Management.entity.InterestRate;
import com.example.Bank_Loan_Management.entity.LoanApplication;
import com.example.Bank_Loan_Management.entity.User;
import com.example.Bank_Loan_Management.repository.InterestRateRepository;
import com.example.Bank_Loan_Management.repository.LoanApplicationRepository;

@Service
public class CreditScoringService {

    private final InterestRateRepository interestRateRepository;
    private final LoanApplicationRepository loanApplicationRepository;

    public CreditScoringService(InterestRateRepository interestRateRepository, LoanApplicationRepository loanApplicationRepository) {
        this.interestRateRepository = interestRateRepository;
        this.loanApplicationRepository = loanApplicationRepository;
    }

    public int calculateCreditScore(User user, BigDecimal amount, Integer term, String purpose) {
        int score = 500; // Base score

        // Income factor
        if (user.getAnnualIncome() != null) {
            if (user.getAnnualIncome().compareTo(BigDecimal.valueOf(100000)) > 0) {
                score += 50;
            } else if (user.getAnnualIncome().compareTo(BigDecimal.valueOf(50000)) > 0) {
                score += 25;
            } else if (user.getAnnualIncome().compareTo(BigDecimal.valueOf(25000)) > 0) {
                score += 10;
            } else {
                score -= 20;
            }
        }

        // Debt-to-Income ratio
        if (user.getAnnualIncome() != null && user.getAnnualIncome().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal totalDebt = user.getExistingDebts() != null ? user.getExistingDebts() : BigDecimal.ZERO;
            totalDebt = totalDebt.add(amount);
            BigDecimal dti = totalDebt.divide(user.getAnnualIncome(), 2, BigDecimal.ROUND_HALF_UP).multiply(BigDecimal.valueOf(100));
            if (dti.compareTo(BigDecimal.valueOf(50)) > 0) {
                score -= 100;
            } else if (dti.compareTo(BigDecimal.valueOf(36)) > 0) {
                score -= 50;
            } else if (dti.compareTo(BigDecimal.valueOf(20)) > 0) {
                score -= 25;
            }
        }

        // Employment status
        if (user.getEmploymentStatus() != null) {
            switch (user.getEmploymentStatus().toUpperCase()) {
                case "EMPLOYED":
                    score += 30;
                    break;
                case "SELF_EMPLOYED":
                    score += 15;
                    break;
                case "UNEMPLOYED":
                    score -= 50;
                    break;
                default:
                    score += 5;
                    break;
            }
        }

        // Age factor
        if (user.getAge() != null) {
            if (user.getAge() < 25) {
                score -= 20;
            } else if (user.getAge() > 40) {
                score += 15;
            } else if (user.getAge() > 30) {
                score += 10;
            }
        }

        // Marital status
        if (user.getMaritalStatus() != null && "MARRIED".equalsIgnoreCase(user.getMaritalStatus())) {
            score += 10;
        }

        // Credit history length
        if (user.getCreditHistoryLength() != null) {
            if (user.getCreditHistoryLength() >= 10) {
                score += 30;
            } else if (user.getCreditHistoryLength() >= 5) {
                score += 20;
            } else if (user.getCreditHistoryLength() >= 2) {
                score += 10;
            } else if (user.getCreditHistoryLength() >= 1) {
                score += 5;
            }
        }

        // Number of late payments
        if (user.getNumberOfLatePayments() != null) {
            if (user.getNumberOfLatePayments() == 0) {
                score += 20;
            } else if (user.getNumberOfLatePayments() <= 2) {
                score -= 10;
            } else if (user.getNumberOfLatePayments() <= 5) {
                score -= 30;
            } else {
                score -= 50;
            }
        }

        // Credit utilization
        if (user.getCreditUtilization() != null) {
            if (user.getCreditUtilization().compareTo(BigDecimal.valueOf(10)) <= 0) {
                score += 20;
            } else if (user.getCreditUtilization().compareTo(BigDecimal.valueOf(30)) <= 0) {
                score += 10;
            } else if (user.getCreditUtilization().compareTo(BigDecimal.valueOf(50)) <= 0) {
                score -= 10;
            } else {
                score -= 30;
            }
        }

        // Number of credit inquiries
        if (user.getNumberOfCreditInquiries() != null) {
            if (user.getNumberOfCreditInquiries() == 0) {
                score += 10;
            } else if (user.getNumberOfCreditInquiries() <= 2) {
                score -= 5;
            } else if (user.getNumberOfCreditInquiries() <= 5) {
                score -= 15;
            } else {
                score -= 25;
            }
        }

        // Credit mix
        if (user.getCreditMix() != null && !user.getCreditMix().isEmpty()) {
            String[] mix = user.getCreditMix().split(",");
            if (mix.length >= 3) {
                score += 15;
            } else if (mix.length == 2) {
                score += 10;
            } else if (mix.length == 1) {
                score += 5;
            }
        }

        // Loan history
        List<LoanApplication> previousLoans = loanApplicationRepository.findByUser(user);
        int approvedCount = 0;
        int rejectedCount = 0;
        int fullyPaidCount = 0;
        int defaultedCount = 0;
        for (LoanApplication loan : previousLoans) {
            if (loan.getStatus() == LoanApplication.Status.APPROVED) {
                approvedCount++;
                // Check if fully paid
                if (loan.getPendingAmount() != null && loan.getPendingAmount().compareTo(BigDecimal.ZERO) == 0) {
                    fullyPaidCount++;
                } else if (loan.getPendingAmount() != null && loan.getPendingAmount().compareTo(BigDecimal.ZERO) > 0) {
                    // Assuming if pending > 0 and it's past due, it's defaulted (simplified)
                    defaultedCount++;
                }
            } else if (loan.getStatus() == LoanApplication.Status.REJECTED) {
                rejectedCount++;
            }
        }
        score += fullyPaidCount * 20;
        score += (approvedCount - fullyPaidCount - defaultedCount) * 10; // partially paid or on-time
        score -= defaultedCount * 50;
        score -= rejectedCount * 25;

        // Amount factor
        if (amount.compareTo(BigDecimal.valueOf(50000)) > 0) {
            score -= 75;
        } else if (amount.compareTo(BigDecimal.valueOf(25000)) > 0) {
            score -= 50;
        } else if (amount.compareTo(BigDecimal.valueOf(10000)) > 0) {
            score -= 25;
        }

        // Term factor
        if (term > 60) {
            score -= 25;
        } else if (term > 36) {
            score -= 15;
        } else if (term > 24) {
            score -= 10;
        } else if (term > 12) {
            score -= 5;
        }

        // Purpose factor
        if ("business".equalsIgnoreCase(purpose)) {
            score -= 40;
        } else if ("personal".equalsIgnoreCase(purpose)) {
            score += 10;
        } else if ("home purchase".equalsIgnoreCase(purpose)) {
            score += 20;
        } else if ("education".equalsIgnoreCase(purpose)) {
            score += 15;
        }

        // Ensure score is between 300 and 850
        return Math.max(300, Math.min(850, score));
    }

    public boolean isEligible(int creditScore, BigDecimal amount) {
        // Simple eligibility: score > 400 and amount < 50000
        return creditScore > 400 && amount.compareTo(BigDecimal.valueOf(50000)) < 0;
    }

    public BigDecimal getInterestRate(String purpose, int creditScore) {
        Optional<InterestRate> interestRateOpt = interestRateRepository.findByPurpose(purpose.toLowerCase());
        if (interestRateOpt.isPresent()) {
            return interestRateOpt.get().getRate();
        }
        // Fallback to default rates if not set in DB
        BigDecimal baseRate;
        switch (purpose.toLowerCase()) {
            case "home purchase": baseRate = BigDecimal.valueOf(8.5);
                break;
            case "car purchase": baseRate = BigDecimal.valueOf(9.5);
                break;
            case "education": baseRate = BigDecimal.valueOf(7.5);
                break;
            case "business": baseRate = BigDecimal.valueOf(10.5);
                break;
            case "personal": baseRate = BigDecimal.valueOf(12.0);
                break;
            case "health": baseRate = BigDecimal.valueOf(8.0);
                break;
            case "travel": baseRate = BigDecimal.valueOf(11.0);
                break;
            case "wedding": baseRate = BigDecimal.valueOf(9.0);
                break;
            case "home renovation": baseRate = BigDecimal.valueOf(8.75);
                break;
            case "debt consolidation": baseRate = BigDecimal.valueOf(11.5);
                break;
            default: baseRate = BigDecimal.valueOf(10.0);
        }
        // Adjust based on credit score
        if (creditScore >= 750) {
            baseRate = baseRate.subtract(BigDecimal.valueOf(1.0));
        } else if (creditScore >= 650) {
            baseRate = baseRate.subtract(BigDecimal.valueOf(0.5));
        } else if (creditScore < 550) {
            baseRate = baseRate.add(BigDecimal.valueOf(1.0));
        } else if (creditScore < 450) {
            baseRate = baseRate.add(BigDecimal.valueOf(2.0));
        }
        return baseRate.max(BigDecimal.valueOf(5.0));
    }

    public String getCreditScoreCategory(int creditScore) {
        if (creditScore >= 750) {
            return "Excellent";
        } else if (creditScore >= 650) {
            return "Good";
        } else if (creditScore >= 550) {
            return "Fair";
        } else {
            return "Poor";
        }
    }
}

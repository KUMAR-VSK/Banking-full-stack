package com.example.Bank_Loan_Management.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.Bank_Loan_Management.entity.LoanApplication;
import com.example.Bank_Loan_Management.entity.User;
import com.example.Bank_Loan_Management.repository.LoanApplicationRepository;

@Service
public class LoanService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final CreditScoringService creditScoringService;
    private final NotificationService notificationService;

    public LoanService(LoanApplicationRepository loanApplicationRepository,
                       CreditScoringService creditScoringService,
                       NotificationService notificationService) {
        this.loanApplicationRepository = loanApplicationRepository;
        this.creditScoringService = creditScoringService;
        this.notificationService = notificationService;
    }

    @Transactional
    public LoanApplication applyForLoan(User user, BigDecimal amount, Integer term, String purpose) {
        LoanApplication application = new LoanApplication();
        application.setUser(user);
        application.setAmount(amount);
        application.setTerm(term);
        application.setPurpose(purpose);
        application.setStatus(LoanApplication.Status.APPLIED);
        application.setAppliedDate(LocalDateTime.now());

        // Calculate credit score
        int creditScore = creditScoringService.calculateCreditScore(amount, term, purpose);
        application.setCreditScore(creditScore);

        LoanApplication saved = loanApplicationRepository.save(application);

        notificationService.sendLoanStatusUpdate(user.getId(), "APPLIED");

        return saved;
    }

    @Transactional
    public LoanApplication verifyLoan(Long applicationId) {
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (application.getStatus() != LoanApplication.Status.APPLIED) {
            throw new RuntimeException("Application is not in APPLIED status");
        }

        application.setStatus(LoanApplication.Status.VERIFIED);
        LoanApplication saved = loanApplicationRepository.save(application);

        notificationService.sendLoanStatusUpdate(application.getUser().getId(), "VERIFIED");

        return saved;
    }

    @Transactional
    public LoanApplication approveOrRejectLoan(Long applicationId) {
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (application.getStatus() != LoanApplication.Status.VERIFIED) {
            throw new RuntimeException("Application is not in VERIFIED status");
        }

        boolean eligible = creditScoringService.isEligible(application.getCreditScore(), application.getAmount());

        application.setStatus(eligible ? LoanApplication.Status.APPROVED : LoanApplication.Status.REJECTED);
        application.setDecisionDate(LocalDateTime.now());

        if (eligible) {
            application.setApprovedAmount(application.getAmount());
            BigDecimal interestRate = creditScoringService.getInterestRate(application.getPurpose());
            application.setInterestRate(interestRate);
            BigDecimal interestAmount = application.getAmount().multiply(interestRate).divide(BigDecimal.valueOf(100));
            BigDecimal totalAmount = application.getAmount().add(interestAmount);
            application.setPaidAmount(BigDecimal.ZERO);
            application.setPendingAmount(totalAmount);
        }

        LoanApplication saved = loanApplicationRepository.save(application);

        notificationService.sendLoanStatusUpdate(application.getUser().getId(), application.getStatus().toString());

        return saved;
    }

    public List<LoanApplication> getLoansByUser(User user) {
        return loanApplicationRepository.findByUser(user);
    }

    public List<LoanApplication> getLoansByStatus(LoanApplication.Status status) {
        return loanApplicationRepository.findByStatus(status);
    }

    public List<LoanApplication> getAllLoans() {
        return loanApplicationRepository.findAll();
    }
}

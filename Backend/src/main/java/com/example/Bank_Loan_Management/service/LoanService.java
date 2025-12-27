package com.example.Bank_Loan_Management.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.Bank_Loan_Management.entity.Document;
import com.example.Bank_Loan_Management.entity.LoanApplication;
import com.example.Bank_Loan_Management.entity.User;
import com.example.Bank_Loan_Management.repository.DocumentRepository;
import com.example.Bank_Loan_Management.repository.LoanApplicationRepository;

@Service
public class LoanService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final DocumentRepository documentRepository;
    private final CreditScoringService creditScoringService;
    private final NotificationService notificationService;

    public LoanService(LoanApplicationRepository loanApplicationRepository,
                       DocumentRepository documentRepository,
                       CreditScoringService creditScoringService,
                       NotificationService notificationService) {
        this.loanApplicationRepository = loanApplicationRepository;
        this.documentRepository = documentRepository;
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
        application.setDocumentsVerified(false);

        // Set interest rate based on purpose
        BigDecimal interestRate = creditScoringService.getInterestRate(purpose);
        application.setInterestRate(interestRate);

        // Calculate credit score
        int creditScore = creditScoringService.calculateCreditScore(amount, term, purpose);
        application.setCreditScore(creditScore);

        LoanApplication saved = loanApplicationRepository.save(application);

        // Link existing documents to this loan application
        List<Document> userDocuments = documentRepository.findByUserIdAndLoanApplicationIdIsNull(user.getId());
        for (Document document : userDocuments) {
            document.setLoanApplication(saved);
            documentRepository.save(document);
        }

        notificationService.sendLoanStatusUpdate(user.getId(), "APPLIED");

        return saved;
    }


    @Transactional
    public LoanApplication rejectLoan(Long applicationId) {
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (application.getStatus() != LoanApplication.Status.VERIFIED) {
            throw new RuntimeException("Application is not in VERIFIED status");
        }

        application.setStatus(LoanApplication.Status.REJECTED);
        application.setDecisionDate(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(application);

        notificationService.sendLoanStatusUpdate(application.getUser().getId(), "REJECTED");

        return saved;
    }

    @Transactional
    public LoanApplication verifyLoanApplication(Long applicationId) {
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (application.getStatus() != LoanApplication.Status.APPLIED) {
            throw new RuntimeException("Application is not in APPLIED status");
        }

        application.setStatus(LoanApplication.Status.VERIFIED);
        application.setDocumentsVerified(true);

        LoanApplication saved = loanApplicationRepository.save(application);

        notificationService.sendLoanStatusUpdate(application.getUser().getId(), "VERIFIED");

        return saved;
    }

    @Transactional
    public LoanApplication approveLoan(Long applicationId) {
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        System.out.println("Approving loan application: " + applicationId + ", current status: " + application.getStatus());

        if (application.getStatus() != LoanApplication.Status.VERIFIED) {
            throw new RuntimeException("Application is not in VERIFIED status: " + application.getStatus());
        }

        application.setStatus(LoanApplication.Status.APPROVED);
        application.setDecisionDate(LocalDateTime.now());

        // Set approval details - use the interest rate that was set during application
        application.setApprovedAmount(application.getAmount());

        // Ensure interest rate is set (fallback to 8.5% if not set)
        BigDecimal interestRate = application.getInterestRate();
        if (interestRate == null || interestRate.compareTo(BigDecimal.ZERO) <= 0) {
            interestRate = BigDecimal.valueOf(8.5);
            application.setInterestRate(interestRate);
        }

        BigDecimal interestAmount = application.getAmount().multiply(interestRate).divide(BigDecimal.valueOf(100));
        BigDecimal totalAmount = application.getAmount().add(interestAmount);
        application.setPaidAmount(BigDecimal.ZERO);
        application.setPendingAmount(totalAmount);

        LoanApplication saved = loanApplicationRepository.save(application);

        notificationService.sendLoanStatusUpdate(application.getUser().getId(), "APPROVED");

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

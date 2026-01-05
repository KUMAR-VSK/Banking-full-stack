package com.example.Bank_Loan_Management.controller;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.Bank_Loan_Management.entity.Document;
import com.example.Bank_Loan_Management.entity.InterestRate;
import com.example.Bank_Loan_Management.entity.LoanApplication;
import com.example.Bank_Loan_Management.entity.User;
import com.example.Bank_Loan_Management.repository.InterestRateRepository;
import com.example.Bank_Loan_Management.repository.UserRepository;
import com.example.Bank_Loan_Management.service.DocumentService;
import com.example.Bank_Loan_Management.service.LoanService;

@RestController
@RequestMapping("/api")
public class LoanController {

    private static final Logger logger = LoggerFactory.getLogger(LoanController.class);

    private final LoanService loanService;
    private final UserRepository userRepository;
    private final DocumentService documentService;
    private final InterestRateRepository interestRateRepository;

    public LoanController(LoanService loanService, UserRepository userRepository, DocumentService documentService, InterestRateRepository interestRateRepository) {
        this.loanService = loanService;
        this.userRepository = userRepository;
        this.documentService = documentService;
        this.interestRateRepository = interestRateRepository;
    }

    // User endpoints
    @PostMapping("/user/documents/upload")
    public ResponseEntity<?> uploadDocument(@AuthenticationPrincipal UserDetails userDetails,
                                            @RequestParam("file") MultipartFile file,
                                            @RequestParam("documentType") String documentType) {
        try {
            logger.info("Document upload request for user: {}, documentType: {}", 
                       userDetails.getUsername(), documentType);
            
            if (userDetails == null) {
                logger.warn("Unauthorized document upload attempt - no authentication");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
            }
            
            Optional<User> userOpt = userRepository.findByUsername(userDetails.getUsername());
            if (userOpt.isEmpty()) {
                logger.warn("User not found: {}", userDetails.getUsername());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }
            
            User user = userOpt.get();
            logger.info("Found user: {} (ID: {})", user.getUsername(), user.getId());
            
            if (file.isEmpty()) {
                logger.warn("Empty file uploaded for user: {}", user.getUsername());
                return ResponseEntity.badRequest().body("Please select a file to upload");
            }
            
            if (documentType == null || documentType.trim().isEmpty()) {
                logger.warn("Missing document type for user: {}", user.getUsername());
                return ResponseEntity.badRequest().body("Document type is required");
            }
            
            Document document = documentService.uploadDocument(user, file, documentType);
            logger.info("Document uploaded successfully: {} for user: {}", document.getFileName(), user.getUsername());
            return ResponseEntity.ok(document);
            
        } catch (IOException e) {
            logger.error("IO error during document upload for user: {}", userDetails.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to upload document: File processing error");
        } catch (Exception e) {
            logger.error("Unexpected error during document upload for user: {}", userDetails.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to upload document: " + e.getMessage());
        }
    }

    @GetMapping("/user/documents")
    public ResponseEntity<?> getMyDocuments(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            logger.info("Fetching documents for user: {}", userDetails.getUsername());
            
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
            }
            
            Optional<User> userOpt = userRepository.findByUsername(userDetails.getUsername());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }
            
            User user = userOpt.get();
            List<Document> documents = documentService.getDocumentsByUser(user);
            logger.info("Found {} documents for user: {}", documents.size(), user.getUsername());
            return ResponseEntity.ok(documents);
            
        } catch (Exception e) {
            logger.error("Error fetching documents for user: {}", userDetails.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch documents: " + e.getMessage());
        }
    }

    @PostMapping("/user/loans/apply")
    public ResponseEntity<?> applyForLoan(@AuthenticationPrincipal UserDetails userDetails,
                                           @RequestBody LoanApplicationRequest request) {
        try {
            logger.info("Loan application request for user: {}", userDetails != null ? userDetails.getUsername() : "null");
            logger.info("Request data - amount: {}, term: {}, purpose: {}", request.getAmount(), request.getTerm(), request.getPurpose());

            if (userDetails == null) {
                logger.warn("No authentication provided");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
            }

            Optional<User> userOpt = userRepository.findByUsername(userDetails.getUsername());
            if (userOpt.isEmpty()) {
                logger.warn("User not found: {}", userDetails.getUsername());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }

            User user = userOpt.get();
            logger.info("Found user: {} (ID: {})", user.getUsername(), user.getId());

            // Check if user has uploaded at least one document
            List<Document> userDocuments = documentService.getDocumentsByUser(user);
            logger.info("User {} has {} documents", user.getUsername(), userDocuments.size());
            for (Document doc : userDocuments) {
                logger.info("Document: ID={}, Type={}, Status={}", doc.getId(), doc.getDocumentType(), doc.getStatus());
            }

            if (userDocuments.isEmpty()) {
                // Check if user has any previous loan applications
                List<LoanApplication> previousLoans = loanService.getLoansByUser(user);
                if (previousLoans.isEmpty()) {
                    logger.warn("User {} has no documents uploaded and no previous loans - rejecting application", user.getUsername());
                    return ResponseEntity.badRequest().body("Please upload at least one document before applying for loan.");
                } else {
                    logger.info("User {} has previous loans, allowing application without new documents", user.getUsername());
                }
            }

            logger.info("Creating loan application for user {}", user.getUsername());
            LoanApplication application = loanService.applyForLoan(user, request.getAmount(), request.getTerm(), request.getPurpose());
            logger.info("Loan application created successfully: {} for user: {}", application.getId(), user.getUsername());

            // Associate uploaded documents with the loan application
            documentService.associateDocumentsWithLoan(user, application);
            logger.info("Documents associated with loan application {}", application.getId());

            return ResponseEntity.ok(application);

        } catch (Exception e) {
            logger.error("Error processing loan application for user: {}", userDetails != null ? userDetails.getUsername() : "null", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to process loan application: " + e.getMessage());
        }
    }

    @GetMapping("/user/loans")
    public ResponseEntity<List<LoanSummaryDTO>> getMyLoans(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<LoanApplication> loans = loanService.getLoansByUser(user);
        List<LoanSummaryDTO> loanSummaries = loans.stream()
                .map(loan -> new LoanSummaryDTO(
                        loan.getId(),
                        loan.getAmount(),
                        loan.getTerm(),
                        loan.getPurpose(),
                        loan.getStatus(),
                        loan.getCreditScore(),
                        loan.getAppliedDate(),
                        loan.getDecisionDate(),
                        loan.getApprovedAmount(),
                        loan.getPaidAmount(),
                        loan.getPendingAmount(),
                        loan.getInterestRate(),
                        loan.getUser(),
                        loan.getLoanManager(),
                        loan.getManager()
                ))
                .toList();
        return ResponseEntity.ok(loanSummaries);
    }

    // Admin endpoints
    @GetMapping("/admin/loans")
    public ResponseEntity<List<LoanSummaryDTO>> getAllLoans() {
        List<LoanApplication> loans = loanService.getAllLoans();
        List<LoanSummaryDTO> loanSummaries = loans.stream()
                .map(loan -> new LoanSummaryDTO(
                        loan.getId(),
                        loan.getAmount(),
                        loan.getTerm(),
                        loan.getPurpose(),
                        loan.getStatus(),
                        loan.getCreditScore(),
                        loan.getAppliedDate(),
                        loan.getDecisionDate(),
                        loan.getApprovedAmount(),
                        loan.getPaidAmount(),
                        loan.getPendingAmount(),
                        loan.getInterestRate(),
                        loan.getUser(),
                        loan.getLoanManager(),
                        loan.getManager()
                ))
                .toList();
        return ResponseEntity.ok(loanSummaries);
    }

    @GetMapping("/admin/loans/status/{status}")
    public ResponseEntity<List<LoanSummaryDTO>> getLoansByStatus(@PathVariable String status) {
        LoanApplication.Status enumStatus = LoanApplication.Status.valueOf(status.toUpperCase());
        List<LoanApplication> loans = loanService.getLoansByStatus(enumStatus);
        List<LoanSummaryDTO> loanSummaries = loans.stream()
                .map(loan -> new LoanSummaryDTO(
                        loan.getId(),
                        loan.getAmount(),
                        loan.getTerm(),
                        loan.getPurpose(),
                        loan.getStatus(),
                        loan.getCreditScore(),
                        loan.getAppliedDate(),
                        loan.getDecisionDate(),
                        loan.getApprovedAmount(),
                        loan.getPaidAmount(),
                        loan.getPendingAmount(),
                        loan.getInterestRate(),
                        loan.getUser(),
                        loan.getLoanManager(),
                        loan.getManager()
                ))
                .toList();
        return ResponseEntity.ok(loanSummaries);
    }

    @GetMapping("/admin/documents")
    public ResponseEntity<List<Document>> getAllDocuments() {
        List<Document> documents = documentService.getAllDocuments();
        return ResponseEntity.ok(documents);
    }

    // Loan Manager endpoints
    @PostMapping("/loan-manager/documents/verify/{id}")
    public ResponseEntity<Document> verifyDocument(@PathVariable Long id) {
        Document document = documentService.verifyDocument(id);
        return ResponseEntity.ok(document);
    }

    @PostMapping("/loan-manager/documents/reject/{id}")
    public ResponseEntity<Document> rejectDocument(@PathVariable Long id) {
        Document document = documentService.rejectDocument(id);
        return ResponseEntity.ok(document);
    }

    @GetMapping("/loan-manager/documents")
    public ResponseEntity<List<DocumentDTO>> getAllDocumentsForVerification() {
        logger.info("Fetching all documents for verification");
        try {
            List<Document> documents = documentService.getAllDocuments();
            logger.info("Found {} documents in database", documents.size());
            List<DocumentDTO> documentDTOs = documents.stream()
                    .map(doc -> new DocumentDTO(
                            doc.getId(),
                            doc.getUser().getId(),
                            doc.getLoanApplication() != null ? doc.getLoanApplication().getId() : null,
                            doc.getDocumentType(),
                            doc.getFileName(),
                            doc.getFilePath(),
                            doc.getContentType(),
                            doc.getFileSize(),
                            doc.getStatus()
                    ))
                    .toList();
            logger.info("Returning {} document DTOs", documentDTOs.size());
            return ResponseEntity.ok(documentDTOs);
        } catch (Exception e) {
            logger.error("Error fetching documents for verification", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/loan-manager/documents/view/{id}")
    public ResponseEntity<Resource> viewDocument(@PathVariable Long id) {
        logger.info("Viewing document with ID: {}", id);
        try {
            Document document = documentService.getAllDocuments().stream()
                    .filter(doc -> doc.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Document not found"));
            logger.info("Found document: {} (file: {})", document.getId(), document.getFileName());

            Resource resource = documentService.downloadDocument(id);
            logger.info("Downloaded resource for document: {}", document.getFileName());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(document.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.getFileName() + "\"")
                    .body(resource);
        } catch (Exception e) {
            logger.error("Error viewing document with ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/loan-manager/loans")
    public ResponseEntity<List<LoanManagerDTO>> getLoansForVerification() {
        List<LoanApplication> loans = loanService.getAllLoans();
        List<LoanManagerDTO> loanSummaries = loans.stream()
                .map(loan -> new LoanManagerDTO(
                        loan.getId(),
                        loan.getAmount(),
                        loan.getTerm(),
                        loan.getPurpose(),
                        loan.getStatus(),
                        loan.getCreditScore(),
                        loan.getAppliedDate(),
                        loan.getDecisionDate(),
                        loan.getApprovedAmount(),
                        loan.getPaidAmount(),
                        loan.getPendingAmount(),
                        loan.getInterestRate(),
                        loan.getUser().getId(),
                        loan.getUser().getUsername(),
                        loan.getUser().getEmail()
                ))
                .toList();
        return ResponseEntity.ok(loanSummaries);
    }

    @PostMapping("/loan-manager/loans/verify/{id}")
    public ResponseEntity<LoanApplication> verifyLoanApplication(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        User loanManager = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        LoanApplication application = loanService.verifyLoanApplication(id, loanManager);
        return ResponseEntity.ok(application);
    }

    @PostMapping("/loan-manager/loans/reject/{id}")
    public ResponseEntity<LoanApplication> rejectLoanApplication(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        User loanManager = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        LoanApplication application = loanService.rejectLoanApplication(id, loanManager);
        return ResponseEntity.ok(application);
    }

    // Manager endpoints
    @PostMapping("/manager/loans/approve/{id}")
    public ResponseEntity<LoanApplication> approveLoan(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        User manager = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        LoanApplication application = loanService.approveLoan(id, manager);
        return ResponseEntity.ok(application);
    }

    @PostMapping("/manager/loans/reject/{id}")
    public ResponseEntity<LoanApplication> rejectLoan(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        User manager = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        LoanApplication application = loanService.rejectLoan(id, manager);
        return ResponseEntity.ok(application);
    }

    @GetMapping("/manager/loans")
    public ResponseEntity<List<LoanManagerDTO>> getLoansForApproval() {
        List<LoanApplication> loans = loanService.getAllLoans();
        List<LoanManagerDTO> loanSummaries = loans.stream()
                .map(loan -> new LoanManagerDTO(
                        loan.getId(),
                        loan.getAmount(),
                        loan.getTerm(),
                        loan.getPurpose(),
                        loan.getStatus(),
                        loan.getCreditScore(),
                        loan.getAppliedDate(),
                        loan.getDecisionDate(),
                        loan.getApprovedAmount(),
                        loan.getPaidAmount(),
                        loan.getPendingAmount(),
                        loan.getInterestRate(),
                        loan.getUser().getId(),
                        loan.getUser().getUsername(),
                        loan.getUser().getEmail()
                ))
                .toList();
        return ResponseEntity.ok(loanSummaries);
    }

    @GetMapping("/manager/loans/status/{status}")
    public ResponseEntity<List<LoanManagerDTO>> getLoansByStatusForApproval(@PathVariable String status) {
        LoanApplication.Status enumStatus = LoanApplication.Status.valueOf(status.toUpperCase());
        List<LoanApplication> loans = loanService.getLoansByStatus(enumStatus);
        List<LoanManagerDTO> loanSummaries = loans.stream()
                .map(loan -> new LoanManagerDTO(
                        loan.getId(),
                        loan.getAmount(),
                        loan.getTerm(),
                        loan.getPurpose(),
                        loan.getStatus(),
                        loan.getCreditScore(),
                        loan.getAppliedDate(),
                        loan.getDecisionDate(),
                        loan.getApprovedAmount(),
                        loan.getPaidAmount(),
                        loan.getPendingAmount(),
                        loan.getInterestRate(),
                        loan.getUser().getId(),
                        loan.getUser().getUsername(),
                        loan.getUser().getEmail()
                ))
                .toList();
        return ResponseEntity.ok(loanSummaries);
    }

    // Interest Rate Management endpoints
    @GetMapping("/manager/interest-rates")
    public ResponseEntity<List<InterestRate>> getInterestRates() {
        List<InterestRate> rates = interestRateRepository.findAll();
        return ResponseEntity.ok(rates);
    }

    @PostMapping("/manager/interest-rates")
    public ResponseEntity<InterestRate> updateInterestRate(@RequestBody InterestRateUpdateRequest request) {
        Optional<InterestRate> existingRate = interestRateRepository.findByPurpose(request.getPurpose().toLowerCase());
        InterestRate rate;
        if (existingRate.isPresent()) {
            rate = existingRate.get();
            rate.setRate(request.getRate());
        } else {
            rate = new InterestRate(request.getPurpose().toLowerCase(), request.getRate());
        }
        InterestRate saved = interestRateRepository.save(rate);
        return ResponseEntity.ok(saved);
    }

    public static class LoanApplicationRequest {
        private BigDecimal amount;
        private Integer term;
        private String purpose;

        // getters and setters
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public Integer getTerm() { return term; }
        public void setTerm(Integer term) { this.term = term; }
        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }
    }

    public static class LoanSummaryDTO {
        private Long id;
        private BigDecimal amount;
        private Integer term;
        private String purpose;
        private LoanApplication.Status status;
        private Integer creditScore;
        private LocalDateTime appliedDate;
        private LocalDateTime decisionDate;
        private BigDecimal approvedAmount;
        private BigDecimal paidAmount;
        private BigDecimal pendingAmount;
        private BigDecimal interestRate;
        private User user;
        private User loanManager;
        private User manager;

        public LoanSummaryDTO(Long id, BigDecimal amount, Integer term, String purpose,
                            LoanApplication.Status status, Integer creditScore, LocalDateTime appliedDate,
                            LocalDateTime decisionDate, BigDecimal approvedAmount, BigDecimal paidAmount,
                            BigDecimal pendingAmount, BigDecimal interestRate, User user, User loanManager, User manager) {
            this.id = id;
            this.amount = amount;
            this.term = term;
            this.purpose = purpose;
            this.status = status;
            this.creditScore = creditScore;
            this.appliedDate = appliedDate;
            this.decisionDate = decisionDate;
            this.approvedAmount = approvedAmount;
            this.paidAmount = paidAmount;
            this.pendingAmount = pendingAmount;
            this.interestRate = interestRate;
            this.user = user;
            this.loanManager = loanManager;
            this.manager = manager;
        }

        // getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public Integer getTerm() { return term; }
        public void setTerm(Integer term) { this.term = term; }
        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }
        public LoanApplication.Status getStatus() { return status; }
        public void setStatus(LoanApplication.Status status) { this.status = status; }
        public Integer getCreditScore() { return creditScore; }
        public void setCreditScore(Integer creditScore) { this.creditScore = creditScore; }
        public LocalDateTime getAppliedDate() { return appliedDate; }
        public void setAppliedDate(LocalDateTime appliedDate) { this.appliedDate = appliedDate; }
        public LocalDateTime getDecisionDate() { return decisionDate; }
        public void setDecisionDate(LocalDateTime decisionDate) { this.decisionDate = decisionDate; }
        public BigDecimal getApprovedAmount() { return approvedAmount; }
        public void setApprovedAmount(BigDecimal approvedAmount) { this.approvedAmount = approvedAmount; }
        public BigDecimal getPaidAmount() { return paidAmount; }
        public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }
        public BigDecimal getPendingAmount() { return pendingAmount; }
        public void setPendingAmount(BigDecimal pendingAmount) { this.pendingAmount = pendingAmount; }
        public BigDecimal getInterestRate() { return interestRate; }
        public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }
        public User getUser() { return user; }
        public void setUser(User user) { this.user = user; }
        public User getLoanManager() { return loanManager; }
        public void setLoanManager(User loanManager) { this.loanManager = loanManager; }
        public User getManager() { return manager; }
        public void setManager(User manager) { this.manager = manager; }
    }

    public static class DocumentDTO {
        private Long id;
        private Long userId;
        private Long loanApplicationId;
        private String documentType;
        private String fileName;
        private String filePath;
        private String contentType;
        private Long fileSize;
        private Document.Status status;

        public DocumentDTO(Long id, Long userId, Long loanApplicationId, String documentType,
                          String fileName, String filePath, String contentType, Long fileSize,
                          Document.Status status) {
            this.id = id;
            this.userId = userId;
            this.loanApplicationId = loanApplicationId;
            this.documentType = documentType;
            this.fileName = fileName;
            this.filePath = filePath;
            this.contentType = contentType;
            this.fileSize = fileSize;
            this.status = status;
        }

        // getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public Long getLoanApplicationId() { return loanApplicationId; }
        public void setLoanApplicationId(Long loanApplicationId) { this.loanApplicationId = loanApplicationId; }
        public String getDocumentType() { return documentType; }
        public void setDocumentType(String documentType) { this.documentType = documentType; }
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getFilePath() { return filePath; }
        public void setFilePath(String filePath) { this.filePath = filePath; }
        public String getContentType() { return contentType; }
        public void setContentType(String contentType) { this.contentType = contentType; }
        public Long getFileSize() { return fileSize; }
        public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
        public Document.Status getStatus() { return status; }
        public void setStatus(Document.Status status) { this.status = status; }
    }

    public static class LoanManagerDTO {
        private Long id;
        private BigDecimal amount;
        private Integer term;
        private String purpose;
        private LoanApplication.Status status;
        private Integer creditScore;
        private LocalDateTime appliedDate;
        private LocalDateTime decisionDate;
        private BigDecimal approvedAmount;
        private BigDecimal paidAmount;
        private BigDecimal pendingAmount;
        private BigDecimal interestRate;
        private Long userId;
        private String username;
        private String userEmail;

        public LoanManagerDTO(Long id, BigDecimal amount, Integer term, String purpose,
                            LoanApplication.Status status, Integer creditScore, LocalDateTime appliedDate,
                            LocalDateTime decisionDate, BigDecimal approvedAmount, BigDecimal paidAmount,
                            BigDecimal pendingAmount, BigDecimal interestRate, Long userId, String username, String userEmail) {
            this.id = id;
            this.amount = amount;
            this.term = term;
            this.purpose = purpose;
            this.status = status;
            this.creditScore = creditScore;
            this.appliedDate = appliedDate;
            this.decisionDate = decisionDate;
            this.approvedAmount = approvedAmount;
            this.paidAmount = paidAmount;
            this.pendingAmount = pendingAmount;
            this.interestRate = interestRate;
            this.userId = userId;
            this.username = username;
            this.userEmail = userEmail;
        }

        // getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public Integer getTerm() { return term; }
        public void setTerm(Integer term) { this.term = term; }
        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }
        public LoanApplication.Status getStatus() { return status; }
        public void setStatus(LoanApplication.Status status) { this.status = status; }
        public Integer getCreditScore() { return creditScore; }
        public void setCreditScore(Integer creditScore) { this.creditScore = creditScore; }
        public LocalDateTime getAppliedDate() { return appliedDate; }
        public void setAppliedDate(LocalDateTime appliedDate) { this.appliedDate = appliedDate; }
        public LocalDateTime getDecisionDate() { return decisionDate; }
        public void setDecisionDate(LocalDateTime decisionDate) { this.decisionDate = decisionDate; }
        public BigDecimal getApprovedAmount() { return approvedAmount; }
        public void setApprovedAmount(BigDecimal approvedAmount) { this.approvedAmount = approvedAmount; }
        public BigDecimal getPaidAmount() { return paidAmount; }
        public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }
        public BigDecimal getPendingAmount() { return pendingAmount; }
        public void setPendingAmount(BigDecimal pendingAmount) { this.pendingAmount = pendingAmount; }
        public BigDecimal getInterestRate() { return interestRate; }
        public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getUserEmail() { return userEmail; }
        public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    }

    public static class InterestRateUpdateRequest {
        private String purpose;
        private BigDecimal rate;

        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }
        public BigDecimal getRate() { return rate; }
        public void setRate(BigDecimal rate) { this.rate = rate; }
    }
}

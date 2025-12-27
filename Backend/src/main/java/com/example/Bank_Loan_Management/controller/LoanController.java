package com.example.Bank_Loan_Management.controller;

import java.io.IOException;
import java.math.BigDecimal;
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
import com.example.Bank_Loan_Management.entity.LoanApplication;
import com.example.Bank_Loan_Management.entity.User;
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

    public LoanController(LoanService loanService, UserRepository userRepository, DocumentService documentService) {
        this.loanService = loanService;
        this.userRepository = userRepository;
        this.documentService = documentService;
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
                logger.warn("User {} has no documents uploaded - rejecting application", user.getUsername());
                return ResponseEntity.badRequest().body("Please upload at least one document before applying for loan. Documents found: " + userDocuments.size());
            }

            logger.info("Creating loan application for user {}", user.getUsername());
            LoanApplication application = loanService.applyForLoan(user, request.getAmount(), request.getTerm(), request.getPurpose());
            logger.info("Loan application created successfully: {} for user: {}", application.getId(), user.getUsername());
            return ResponseEntity.ok(application);

        } catch (Exception e) {
            logger.error("Error processing loan application for user: {}", userDetails != null ? userDetails.getUsername() : "null", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to process loan application: " + e.getMessage());
        }
    }

    @GetMapping("/user/loans")
    public ResponseEntity<List<LoanApplication>> getMyLoans(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<LoanApplication> loans = loanService.getLoansByUser(user);
        return ResponseEntity.ok(loans);
    }

    // Admin endpoints
    @GetMapping("/admin/loans")
    public ResponseEntity<List<LoanApplication>> getAllLoans() {
        List<LoanApplication> loans = loanService.getAllLoans();
        return ResponseEntity.ok(loans);
    }

    @GetMapping("/admin/loans/status/{status}")
    public ResponseEntity<List<LoanApplication>> getLoansByStatus(@PathVariable String status) {
        LoanApplication.Status enumStatus = LoanApplication.Status.valueOf(status.toUpperCase());
        List<LoanApplication> loans = loanService.getLoansByStatus(enumStatus);
        return ResponseEntity.ok(loans);
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
    public ResponseEntity<List<Document>> getAllDocumentsForVerification() {
        List<Document> documents = documentService.getAllDocuments();
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/loan-manager/documents/view/{id}")
    public ResponseEntity<Resource> viewDocument(@PathVariable Long id) {
        try {
            Document document = documentService.getAllDocuments().stream()
                    .filter(doc -> doc.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Document not found"));

            Resource resource = documentService.downloadDocument(id);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(document.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.getFileName() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/loan-manager/loans")
    public ResponseEntity<List<LoanApplication>> getLoansForVerification() {
        List<LoanApplication> loans = loanService.getAllLoans();
        return ResponseEntity.ok(loans);
    }

    @PostMapping("/loan-manager/loans/verify/{id}")
    public ResponseEntity<LoanApplication> verifyLoanApplication(@PathVariable Long id) {
        LoanApplication application = loanService.verifyLoanApplication(id);
        return ResponseEntity.ok(application);
    }

    // Manager endpoints
    @PostMapping("/manager/loans/approve/{id}")
    public ResponseEntity<LoanApplication> approveLoan(@PathVariable Long id) {
        LoanApplication application = loanService.approveLoan(id);
        return ResponseEntity.ok(application);
    }

    @PostMapping("/manager/loans/reject/{id}")
    public ResponseEntity<LoanApplication> rejectLoan(@PathVariable Long id) {
        LoanApplication application = loanService.rejectLoan(id);
        return ResponseEntity.ok(application);
    }

    @GetMapping("/manager/loans")
    public ResponseEntity<List<LoanApplication>> getLoansForApproval() {
        List<LoanApplication> loans = loanService.getAllLoans();
        return ResponseEntity.ok(loans);
    }

    @GetMapping("/manager/loans/status/{status}")
    public ResponseEntity<List<LoanApplication>> getLoansByStatusForApproval(@PathVariable String status) {
        LoanApplication.Status enumStatus = LoanApplication.Status.valueOf(status.toUpperCase());
        List<LoanApplication> loans = loanService.getLoansByStatus(enumStatus);
        return ResponseEntity.ok(loans);
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
}

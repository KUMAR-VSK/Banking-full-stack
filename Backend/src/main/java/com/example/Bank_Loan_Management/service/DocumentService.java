package com.example.Bank_Loan_Management.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.Bank_Loan_Management.entity.Document;
import com.example.Bank_Loan_Management.entity.LoanApplication;
import com.example.Bank_Loan_Management.entity.User;
import com.example.Bank_Loan_Management.repository.DocumentRepository;
import com.example.Bank_Loan_Management.repository.LoanApplicationRepository;
import com.example.Bank_Loan_Management.repository.UserRepository;

@Service
public class DocumentService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private LoanApplicationRepository loanApplicationRepository;

    @Autowired
    private UserRepository userRepository;

    private final Path root = Paths.get("uploads");

    public DocumentService() {
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize folder for upload!");
        }
    }

    public Document uploadDocument(User user, MultipartFile file, String documentType) throws IOException {
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = root.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        Document document = new Document();
        document.setUser(user);
        document.setDocumentType(documentType);
        document.setFileName(file.getOriginalFilename());
        document.setFilePath(filePath.toString());
        document.setContentType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setStatus(Document.Status.UPLOADED);

        return documentRepository.save(document);
    }

    public List<Document> getDocumentsByLoanApplication(Long loanApplicationId) {
        return documentRepository.findByLoanApplicationId(loanApplicationId);
    }

    public List<Document> getDocumentsByUser(User user) {
        return documentRepository.findByUser(user);
    }

    public Document verifyDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        document.setStatus(Document.Status.VERIFIED);
        Document saved = documentRepository.save(document);

        // Check if all document types have at least one verified document
        List<Document> userDocuments = documentRepository.findByUser(document.getUser());

        // Group documents by type and check if each type has at least one verified document
        boolean allTypesVerified = userDocuments.stream()
                .collect(Collectors.groupingBy(Document::getDocumentType))
                .entrySet()
                .stream()
                .allMatch(entry -> entry.getValue().stream()
                        .anyMatch(doc -> doc.getStatus() == Document.Status.VERIFIED));

        if (allTypesVerified) {
            // Update all loan applications for this user to mark documents as verified and change status to VERIFIED
            List<LoanApplication> userApplications = loanApplicationRepository.findByUser(document.getUser());
            for (LoanApplication application : userApplications) {
                application.setDocumentsVerified(true);
                // Change status from APPLIED to VERIFIED so managers can approve
                if (application.getStatus() == LoanApplication.Status.APPLIED) {
                    application.setStatus(LoanApplication.Status.VERIFIED);
                }
                loanApplicationRepository.save(application);
            }
        }

        return saved;
    }

    public Document rejectDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        document.setStatus(Document.Status.REJECTED);
        Document saved = documentRepository.save(document);

        // When a document is rejected, mark all loan applications for this user as not verified
        List<LoanApplication> userApplications = loanApplicationRepository.findByUser(document.getUser());
        for (LoanApplication application : userApplications) {
            application.setDocumentsVerified(false);
            loanApplicationRepository.save(application);
        }

        return saved;
    }

    public void associateDocumentsWithLoan(User user, LoanApplication application) {
        List<Document> userDocuments = documentRepository.findByUser(user);
        for (Document doc : userDocuments) {
            if (doc.getLoanApplication() == null) {
                doc.setLoanApplication(application);
                documentRepository.save(doc);
            }
        }
    }

    public List<Document> getAllDocuments() {
        List<Document> documents = documentRepository.findAll();
        System.out.println("DocumentService.getAllDocuments() found " + documents.size() + " documents");
        return documents;
    }

    public Resource downloadDocument(Long documentId) throws IOException {
        System.out.println("DocumentService.downloadDocument() called for ID: " + documentId);
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        System.out.println("Found document: " + document.getFileName() + ", path: " + document.getFilePath());

        Path filePath = Paths.get(document.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());
        System.out.println("File path exists: " + filePath.toFile().exists() + ", resource exists: " + resource.exists() + ", readable: " + resource.isReadable());

        if (resource.exists() || resource.isReadable()) {
            return resource;
        } else {
            throw new RuntimeException("Could not read the file!");
        }
    }
}

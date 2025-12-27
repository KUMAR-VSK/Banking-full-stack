package com.example.Bank_Loan_Management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.Bank_Loan_Management.entity.Document;
import com.example.Bank_Loan_Management.entity.User;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByLoanApplicationId(Long loanApplicationId);
    List<Document> findByLoanApplicationIdAndStatus(Long loanApplicationId, Document.Status status);
    List<Document> findByUser(User user);
    List<Document> findByUserIdAndLoanApplicationIdIsNull(Long userId);
}

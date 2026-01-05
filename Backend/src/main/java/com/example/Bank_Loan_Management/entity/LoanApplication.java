package com.example.Bank_Loan_Management.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "loan_applications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "loan_manager_id")
    private User loanManager;

    @ManyToOne
    @JoinColumn(name = "manager_id")
    private User manager;

    @OneToMany(mappedBy = "loanApplication")
    @JsonIgnore
    private List<Document> documents;

    @Column(nullable = false)
    private boolean documentsVerified = false;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private Integer term; // in months

    @Column(nullable = false)
    private String purpose;

    @Enumerated(EnumType.STRING)
    private Status status;

    private Integer creditScore;

    private LocalDateTime appliedDate;

    private LocalDateTime decisionDate;

    private BigDecimal approvedAmount;

    private BigDecimal paidAmount;

    private BigDecimal pendingAmount;

    @Column(precision = 5, scale = 2)
    private BigDecimal interestRate;

    public enum Status {
        APPLIED, VERIFIED, APPROVED, REJECTED
    }
}

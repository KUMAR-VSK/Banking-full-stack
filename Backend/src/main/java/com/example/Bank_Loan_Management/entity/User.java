package com.example.Bank_Loan_Management.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(unique = true, nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    // Additional fields for credit scoring
    private BigDecimal annualIncome;
    private String employmentStatus; // EMPLOYED, SELF_EMPLOYED, UNEMPLOYED
    private Integer age;
    private String maritalStatus; // SINGLE, MARRIED, DIVORCED
    private BigDecimal existingDebts; // Total outstanding debts
    private Integer creditHistoryLength; // in years
    private Integer numberOfLatePayments;
    private BigDecimal creditUtilization; // percentage (e.g., 30.5 for 30.5%)
    private Integer numberOfCreditInquiries;
    private String creditMix; // e.g., "mortgage,credit_card,auto"

    public enum Role {
        USER, LOAN_MANAGER, MANAGER, ADMIN
    }
}

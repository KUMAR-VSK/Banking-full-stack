package com.example.Bank_Loan_Management.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.Bank_Loan_Management.entity.InterestRate;

@Repository
public interface InterestRateRepository extends JpaRepository<InterestRate, Long> {
    Optional<InterestRate> findByPurpose(String purpose);
}
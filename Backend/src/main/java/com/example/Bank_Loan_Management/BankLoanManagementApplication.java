package com.example.Bank_Loan_Management;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import com.example.Bank_Loan_Management.entity.User;
import com.example.Bank_Loan_Management.repository.UserRepository;
import com.example.Bank_Loan_Management.service.AuthService;

@SpringBootApplication
public class BankLoanManagementApplication {

	public static void main(String[] args) {
		SpringApplication.run(BankLoanManagementApplication.class, args);
	}

	@Bean
	CommandLineRunner initDatabase(UserRepository userRepository, AuthService authService) {
		return args -> {
			try {
				// Create default admin user if it doesn't exist
				if (userRepository.findByUsername("testuser").isEmpty()) {
					try {
						User adminUser = authService.register("testuser", "testuser", "admin@example.com", User.Role.ADMIN);
						System.out.println("Default admin user created: testuser/testuser (ID: " + adminUser.getId() + ")");
					} catch (Exception e) {
						System.err.println("Failed to create default admin user: " + e.getMessage());
						e.printStackTrace();
					}
				} else {
					System.out.println("Default admin user already exists: testuser");
				}

				// Create default loan manager user if it doesn't exist
				if (userRepository.findByUsername("loanmanager").isEmpty()) {
					try {
						User loanManagerUser = authService.register("loanmanager", "loanmanager", "loanmanager@example.com", User.Role.LOAN_MANAGER);
						System.out.println("Default loan manager user created: loanmanager/loanmanager (ID: " + loanManagerUser.getId() + ")");
					} catch (Exception e) {
						System.err.println("Failed to create default loan manager user: " + e.getMessage());
						e.printStackTrace();
					}
				} else {
					System.out.println("Default loan manager user already exists: loanmanager");
				}

				// Create default manager user if it doesn't exist
				if (userRepository.findByUsername("manager").isEmpty()) {
					try {
						User managerUser = authService.register("manager", "manager", "manager@example.com", User.Role.MANAGER);
						System.out.println("Default manager user created: manager/manager (ID: " + managerUser.getId() + ")");
					} catch (Exception e) {
						System.err.println("Failed to create default manager user: " + e.getMessage());
						e.printStackTrace();
					}
				} else {
					System.out.println("Default manager user already exists: manager");
				}

				System.out.println("Database initialization completed successfully");

			} catch (Exception e) {
				System.err.println("Error during database initialization: " + e.getMessage());
				e.printStackTrace();
			}
		};
	}

}

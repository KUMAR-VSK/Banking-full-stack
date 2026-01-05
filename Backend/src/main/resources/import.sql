-- Insert test users
INSERT INTO users (username, password, email, role, created_at) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@example.com', 'ADMIN', CURRENT_TIMESTAMP),
('loanmanager', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager@example.com', 'LOAN_MANAGER', CURRENT_TIMESTAMP),
('user1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user1@example.com', 'USER', CURRENT_TIMESTAMP);

-- Insert test loan application
INSERT INTO loan_applications (user_id, amount, term, purpose, status, credit_score, applied_date, approved_amount, paid_amount, pending_amount, interest_rate, loan_manager_id, manager_id, documents_verified) VALUES
(3, 100000.00, 12, 'Home Purchase', 'APPLIED', 750, CURRENT_TIMESTAMP, null, 0.00, 100000.00, null, null, null, false);

-- Insert test documents associated with the loan
INSERT INTO documents (user_id, loan_application_id, document_type, file_name, file_path, content_type, file_size, status) VALUES
(3, 1, 'IDENTITY', 'passport.pdf', 'uploads/test_passport.pdf', 'application/pdf', 1024, 'UPLOADED'),
(3, 1, 'INCOME', 'salary_slip.pdf', 'uploads/test_salary.pdf', 'application/pdf', 2048, 'VERIFIED'),
(3, 1, 'ADDRESS', 'utility_bill.pdf', 'uploads/test_utility.pdf', 'application/pdf', 1536, 'UPLOADED');
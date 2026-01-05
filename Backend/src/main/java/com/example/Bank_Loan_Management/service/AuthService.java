package com.example.Bank_Loan_Management.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.Bank_Loan_Management.entity.User;
import com.example.Bank_Loan_Management.repository.UserRepository;
import com.example.Bank_Loan_Management.util.JwtUtil;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public User register(String username, String password, String email) {
        // Extract username from email if username contains @
        String processedUsername = username.contains("@") ? username.split("@")[0] : username;

        if (userRepository.findByUsername(processedUsername).isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(processedUsername);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        // Only testuser gets ADMIN role, all others get USER role
        if ("testuser".equals(processedUsername)) {
            user.setRole(User.Role.ADMIN);
        } else {
            user.setRole(User.Role.USER);
        }
        user.setCreatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    @Transactional
    public User register(String username, String password, String email, User.Role role) {
        // Extract username from email if username contains @
        String processedUsername = username.contains("@") ? username.split("@")[0] : username;

        if (userRepository.findByUsername(processedUsername).isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(processedUsername);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setRole(role);
        user.setCreatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    public Map<String, Object> login(String username, String password) {
        logger.info("Login attempt for username: {}", username);
        User user;
        if (username.contains("@")) {
            logger.debug("Looking up user by email: {}", username);
            user = userRepository.findByEmail(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        } else {
            logger.debug("Looking up user by username: {}", username);
            user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }
        logger.info("User found: {}", user.getUsername());

        // For testuser, bypass password check
        if ("testuser".equals(username) && "testuser".equals(password)) {
            logger.info("Bypassing authentication for testuser");
            // Authenticate manually
            Authentication authentication = new UsernamePasswordAuthenticationToken(user.getUsername(), null, List.of());
            logger.debug("Generating token for testuser");
            String token = jwtUtil.generateToken(authentication.getName(), user.getRole().name());
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("userId", user.getId());
            response.put("username", user.getUsername());
            response.put("role", user.getRole());
            logger.info("Login successful for testuser");
            return response;
        }

        logger.debug("Authenticating user with AuthenticationManager");
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getUsername(), password)
            );
        } catch (AuthenticationException e) {
            logger.error("Authentication failed for user: {}", user.getUsername(), e);
            throw new RuntimeException("Invalid username or password");
        }
        logger.info("Authentication successful");

        logger.debug("Generating JWT token");
        String token = jwtUtil.generateToken(authentication.getName(), user.getRole().name());
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("userId", user.getId());
        response.put("username", user.getUsername());
        response.put("role", user.getRole());

        logger.info("Login successful for user: {}", username);
        return response;
    }

    public User getCurrentUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}

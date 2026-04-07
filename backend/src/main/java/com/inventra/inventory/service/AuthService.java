package com.inventra.inventory.service;

import com.inventra.inventory.dto.AuthRequest;
import com.inventra.inventory.dto.AuthResponse;
import com.inventra.inventory.dto.RegisterRequest;
import com.inventra.inventory.dto.UserDTO;
import com.inventra.inventory.exception.ResourceAlreadyExistsException;
import com.inventra.inventory.exception.ResourceNotFoundException;
import com.inventra.inventory.model.Role;
import com.inventra.inventory.model.User;
import com.inventra.inventory.repository.*;
import com.inventra.inventory.security.JwtUtil;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final EntityManager entityManager;
    private final RealtimeEventService realtimeEventService;
    // FK child repositories needed for safe user deletion
    private final StockOutApprovalRequestRepository approvalRepo;
    private final StaffCategoryAssignmentRepository staffCatRepo;
    private final ManagerCategoryAssignmentRepository managerCatRepo;
    private final PasswordResetTokenRepository passwordResetTokenRepo;
    private final StockTransactionRepository stockTransactionRepository;

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResourceAlreadyExistsException("Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResourceAlreadyExistsException("Email already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setRole(request.getRole() != null ? request.getRole() : Role.STAFF);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            User currentUser = (User) auth.getPrincipal();
            user.setCreatedBy(currentUser.getId());
        }

        User savedUser = userRepository.save(user);

        realtimeEventService.userUpdated("CREATED", savedUser.getId());

        String token = jwtUtil.generateToken(savedUser);

        return AuthResponse.builder()
                .token(token)
                .user(convertToDTO(savedUser))
                .message("User registered successfully")
                .build();
    }

    public AuthResponse login(AuthRequest request) {

        User user = userRepository.findByUsername(request.getUsername()).orElse(null);

        if (user != null && user.getAccountLockedUntil() != null) {
            if (LocalDateTime.now().isBefore(user.getAccountLockedUntil())) {

                long minutesRemaining = java.time.Duration.between(LocalDateTime.now(), user.getAccountLockedUntil())
                        .toMinutes();
                throw new IllegalArgumentException(
                        String.format("Your account has been locked due to multiple failed login attempts. " +
                                "Please try again in %d minutes or contact the admin to unlock your account immediately.",
                                minutesRemaining + 1));
            } else {

                user.setAccountLockedUntil(null);
                user.setFailedLoginAttempts(0);
                user.setAccountNonLocked(true);
                userRepository.save(user);
            }
        }

        try {

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {

            if (user != null) {

                int attempts = (user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1;
                user.setFailedLoginAttempts(attempts);

                if (attempts >= 5) {
                    // Lock the account for 30 minutes
                    LocalDateTime lockUntil = LocalDateTime.now().plusMinutes(30);
                    user.setAccountLockedUntil(lockUntil);
                    user.setAccountNonLocked(false);
                    userRepository.save(user);

                    try {
                        emailService.sendAccountLockoutEmail(user.getEmail(), user.getFullName(), lockUntil);
                    } catch (Exception mailEx) {

                        System.err.println("Failed to send lockout email: " + mailEx.getMessage());
                    }

                    throw new IllegalArgumentException(
                            "Your account has been locked due to multiple failed login attempts. " +
                                    "Please try again in 30 minutes or contact the admin to unlock your account immediately.");
                } else {
                    // Save failed attempt count
                    userRepository.save(user);
                    throw new IllegalArgumentException("Incorrect password");
                }
            } else {

                throw new ResourceNotFoundException("User not found. Please check your username.");
            }
        } catch (org.springframework.security.authentication.DisabledException e) {

            String contactPerson = switch (user.getRole()) {
                case ADMIN -> "system administrator";
                case MANAGER -> "admin";
                case STAFF -> "manager";
            };

            throw new IllegalArgumentException(
                    String.format("Your account has been disabled. Please contact the %s for assistance.",
                            contactPerson));
        }

        user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.getEnabled()) {
            String contactPerson = switch (user.getRole()) {
                case ADMIN -> "system administrator";
                case MANAGER -> "admin";
                case STAFF -> "manager";
            };

            throw new IllegalArgumentException(
                    String.format("Your account has been disabled. Please contact the %s for assistance.",
                            contactPerson));
        }

        if (user.getActiveSessionId() != null && !user.getActiveSessionId().isEmpty()) {
            throw new IllegalArgumentException(
                    "CONCURRENT_SESSION:You are already logged in on another device/browser. " +
                            "Please logout from the other session first, or click 'Force Logout' to terminate the previous session and login here.");
        }

        if (request.getSelectedRole() != null && !user.getRole().equals(request.getSelectedRole())) {
            throw new IllegalArgumentException(
                    String.format(
                            "Invalid role selected. Your account has %s role, but you selected %s. Please select the correct role to login.",
                            user.getRole().name(),
                            request.getSelectedRole().name()));
        }

        if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0) {
            user.setFailedLoginAttempts(0);
        }

        String sessionId = java.util.UUID.randomUUID().toString();
        user.setActiveSessionId(sessionId);
        userRepository.save(user);

        String token = jwtUtil.generateTokenWithSessionId(user, sessionId);

        return AuthResponse.builder().token(token).user(convertToDTO(user))
                .message("Login successful")
                .build();
    }

    @Transactional
    public java.util.Map<String, String> forceLogoutAndLogin(AuthRequest request) {
        // Find user
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String otp = String.format("%05d", new java.util.Random().nextInt(100000));
        user.setForceLogoutOtp(otp);
        user.setForceLogoutOtpExpiry(LocalDateTime.now().plusSeconds(35)); // 35 seconds expiry

        userRepository.save(user);

        emailService.sendForceLogoutOtp(user.getEmail(), user.getFullName(), otp);

        return java.util.Map.of(
                "message", "OTP_REQUIRED",
                "email", maskEmail(user.getEmail()));
    }

    @Transactional
    public AuthResponse verifyForceLogoutOtp(String username, String otp, AuthRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getForceLogoutOtp() == null || user.getForceLogoutOtpExpiry() == null) {
            throw new IllegalArgumentException("No OTP found. Please request a new one.");
        }

        if (LocalDateTime.now().isAfter(user.getForceLogoutOtpExpiry())) {
            user.setForceLogoutOtp(null);
            user.setForceLogoutOtpExpiry(null);
            userRepository.save(user);
            throw new IllegalArgumentException("OTP has expired. Please request a new one.");
        }

        if (!user.getForceLogoutOtp().equals(otp)) {
            throw new IllegalArgumentException("Invalid OTP. Please try again.");
        }

        user.setActiveSessionId(null);

        user.setForceLogoutOtp(null);
        user.setForceLogoutOtpExpiry(null);
        userRepository.save(user);

        entityManager.flush();

        return login(request);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        String[] parts = email.split("@");
        String localPart = parts[0];
        String domain = parts[1];

        if (localPart.length() <= 2) {
            return "*".repeat(localPart.length()) + "@" + domain;
        }

        return localPart.charAt(0) + "*".repeat(localPart.length() - 2) + localPart.charAt(localPart.length() - 1) + "@"
                + domain;
    }

    @Transactional
    public void logout() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User) {
                User user = (User) auth.getPrincipal();
                User dbUser = userRepository.findById(user.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("User not found"));

                // Clear session + mark offline immediately
                dbUser.setActiveSessionId(null);
                dbUser.setLastActiveAt(null);
                userRepository.save(dbUser);

                // Broadcast so StaffStockOut and other pages refresh manager lists
                realtimeEventService.userUpdated("LOGGED_OUT", dbUser.getId());
            }
        } catch (Exception e) {
            System.err.println("Error during logout: " + e.getMessage());
        }
    }

    /**
     * Called by the JWT filter on every authenticated request to keep
     * lastActiveAt fresh. Skipped if the user was active in the last minute
     * to avoid excessive DB writes.
     */
    @Transactional
    public void touchLastActive(Long userId) {
        try {
            userRepository.findById(userId).ifPresent(u -> {
                LocalDateTime now = LocalDateTime.now();
                // Only write if last touch > 60 seconds ago (reduces DB pressure)
                if (u.getLastActiveAt() == null ||
                        u.getLastActiveAt().isBefore(now.minusSeconds(60))) {
                    u.setLastActiveAt(now);
                    userRepository.save(u);
                }
            });
        } catch (Exception e) {
            System.err.println("Error updating lastActiveAt: " + e.getMessage());
        }
    }

    public UserDTO getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        return convertToDTO(user);
    }

    public boolean validateCurrentSession() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !(auth.getPrincipal() instanceof User)) {
                return false;
            }

            User user = (User) auth.getPrincipal();
            User dbUser = userRepository.findById(user.getId()).orElse(null);

            if (dbUser == null || dbUser.getActiveSessionId() == null) {
                return false;
            }

            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<UserDTO> getUsersByRole(Role role) {
        return userRepository.findByRole(role).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDTO updateUser(Long id, RegisterRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new ResourceAlreadyExistsException("Username already exists");
            }
            user.setUsername(request.getUsername());
        }

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new ResourceAlreadyExistsException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        User updatedUser = userRepository.save(user);
        realtimeEventService.userUpdated("UPDATED", updatedUser.getId());
        return convertToDTO(updatedUser);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // ── Remove all FK-constrained child records first ──────────────────────
        // 1. Password reset tokens
        passwordResetTokenRepo.deleteByUser(user);

        // 2. Stock-out approval requests (as staff or as manager)
        approvalRepo.deleteAll(approvalRepo.findByStaffIdOrderByRequestedAtDesc(id));
        approvalRepo.deleteAll(approvalRepo.findByManagerIdOrderByRequestedAtDesc(id));

        // 3. Staff category assignments (as staff member or as assigner)
        staffCatRepo.deleteAll(staffCatRepo.findByStaffIdAndIsActiveTrue(id));
        staffCatRepo.deleteAll(staffCatRepo.findByAssignedByIdAndIsActiveTrue(id));

        // 4. Manager category assignments (as manager or as admin who assigned)
        managerCatRepo.deleteAll(managerCatRepo.findByManagerIdAndIsActiveTrue(id));
        managerCatRepo.deleteAll(managerCatRepo.findByAssignedByIdAndIsActiveTrue(id));

        // 5. Null-out performed_by on stock transactions (preserve audit history)
        stockTransactionRepository.findByPerformedById(id,
                org.springframework.data.domain.Pageable.unpaged())
                .forEach(tx -> {
                    tx.setPerformedBy(null);
                    stockTransactionRepository.save(tx);
                });

        // ── Now safe to delete the user ───────────────────────────────────────
        userRepository.delete(user);
        realtimeEventService.userUpdated("DELETED", id);
    }

    @Transactional
    public UserDTO toggleUserStatus(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setEnabled(!user.getEnabled());
        User updatedUser = userRepository.save(user);
        realtimeEventService.userUpdated("TOGGLED", updatedUser.getId());
        return convertToDTO(updatedUser);
    }

    @Transactional
    public void unlockUserAccount(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setAccountLockedUntil(null);
        user.setFailedLoginAttempts(0);
        user.setAccountNonLocked(true);

        userRepository.save(user);
    }

    private UserDTO convertToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .enabled(user.getEnabled())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .failedLoginAttempts(user.getFailedLoginAttempts())
                .accountLockedUntil(user.getAccountLockedUntil())
                .build();
    }
}

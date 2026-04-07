package com.inventra.inventory.service;

import com.inventra.inventory.exception.ResourceNotFoundException;
import com.inventra.inventory.model.PasswordResetToken;
import com.inventra.inventory.model.User;
import com.inventra.inventory.repository.PasswordResetTokenRepository;
import com.inventra.inventory.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${password.reset.token.expiration}")
    private Long tokenExpirationMs;

    @Transactional
    public void initiatePasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with email: " + email));


        tokenRepository.deleteByUser(user);


        String token = UUID.randomUUID().toString();

        // Calculate expiry time (15 minutes from now)
        LocalDateTime expiryDate = LocalDateTime.now().plusSeconds(tokenExpirationMs / 1000);

        // Create and save token
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiryDate(expiryDate)
                .used(false)
                .build();

        tokenRepository.save(resetToken);


        emailService.sendPasswordResetEmail(user.getEmail(), token, user.getUsername());

        log.info("Password reset initiated for user: {}", user.getUsername());
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid password reset token"));

        // Check if token is expired
        if (resetToken.isExpired()) {
            throw new IllegalArgumentException("Password reset token has expired");
        }

        // Check if token was already used
        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("Password reset token has already been used");
        }

        // Update user password
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        // Send confirmation email
        emailService.sendPasswordResetConfirmation(user.getEmail(), user.getUsername());

        log.info("Password reset successful for user: {}", user.getUsername());
    }

    public void validateToken(String token) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid password reset token"));

        if (resetToken.isExpired()) {
            throw new IllegalArgumentException("Password reset token has expired");
        }

        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("Password reset token has already been used");
        }
    }


    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupExpiredTokens() {
        tokenRepository.deleteByExpiryDateBefore(LocalDateTime.now());
        log.info("Cleaned up expired password reset tokens");
    }
}

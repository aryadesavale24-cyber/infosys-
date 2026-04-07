package com.inventra.inventory.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    public void sendPasswordResetEmail(String toEmail, String token, String username) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Inventra - Password Reset Request");

            String resetUrl = frontendUrl + "/reset-password?token=" + token;

            String emailBody = String.format(
                    "Hello %s,\n\n" +
                            "We received a request to reset your password for your Inventra account.\n\n" +
                            "Click the link below to reset your password:\n" +
                            "%s\n\n" +
                            "This link will expire in 15 minutes.\n\n" +
                            "If you didn't request this password reset, please ignore this email.\n\n" +
                            "Best regards,\n" +
                            "Inventra Team",
                    username,
                    resetUrl);

            message.setText(emailBody);

            mailSender.send(message);
            log.info("Password reset email sent to: {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send email. Please try again later.");
        }
    }

    public void sendPasswordResetConfirmation(String toEmail, String username) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Inventra - Password Reset Successful");

            String emailBody = String.format(
                    "Hello %s,\n\n" +
                            "Your password has been successfully reset.\n\n" +
                            "If you didn't make this change, please contact support immediately.\n\n" +
                            "Best regards,\n" +
                            "Inventra Team",
                    username);

            message.setText(emailBody);

            mailSender.send(message);
            log.info("Password reset confirmation email sent to: {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send confirmation email to: {}", toEmail, e);

        }
    }

    public void sendAccountLockoutEmail(String toEmail, String fullName, java.time.LocalDateTime lockUntil) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Inventra - Account Locked Due to Failed Login Attempts");

            String emailBody = String.format(
                    "Hello %s,\n\n" +
                            "Your Inventra account has been temporarily locked due to multiple failed login attempts.\n\n"
                            +
                            "For your security, your account will be automatically unlocked at: %s\n\n" +
                            "If you need immediate access, please contact your administrator to unlock your account.\n\n"
                            +
                            "If you didn't attempt to login, please contact support immediately as your account may be compromised.\n\n"
                            +
                            "Best regards,\n" +
                            "Inventra Security Team",
                    fullName,
                    lockUntil.format(java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy hh:mm a")));

            message.setText(emailBody);

            mailSender.send(message);
            log.info("Account lockout email sent to: {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send account lockout email to: {}", toEmail, e);

        }
    }

    public void sendForceLogoutOtp(String toEmail, String fullName, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Inventra - Security Alert: Force Logout OTP");

            String emailBody = String.format(
                    "Hello %s,\n\n" +
                            "We detected a concurrent login attempt on your Inventra account.\n\n" +
                            "Someone is trying to force logout your existing session and login from a new device/browser.\n\n"
                            +
                            "Your One-Time Password (OTP) is:\n\n" +
                            "    %s\n\n" +
                            "This OTP is valid for 35 seconds only.\n\n" +
                            "If you did not initiate this request, please:\n" +
                            "1. Do NOT share this OTP with anyone\n" +
                            "2. Change your password immediately\n" +
                            "3. Contact your administrator\n\n" +
                            "For security reasons, this OTP will expire in 35 seconds.\n\n" +
                            "Best regards,\n" +
                            "Inventra Security Team\n\n" +
                            "---\n" +
                            "This is an automated security email. Please do not reply.",
                    fullName,
                    otp);

            message.setText(emailBody);

            mailSender.send(message);
            log.info("Force logout OTP email sent to: {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send force logout OTP email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send OTP email. Please try again.");
        }
    }
}

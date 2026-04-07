package com.inventra.inventory.controller;

import com.inventra.inventory.dto.ForgotPasswordRequest;
import com.inventra.inventory.dto.ResetPasswordRequest;
import com.inventra.inventory.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/password")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        passwordResetService.initiatePasswordReset(request.getEmail());

        Map<String, String> response = new HashMap<>();
        response.put("message", "If an account exists with this email, a password reset link has been sent.");

        return ResponseEntity.ok(response);
    }

    @GetMapping("/validate-token")
    public ResponseEntity<Map<String, String>> validateToken(@RequestParam String token) {
        try {
            passwordResetService.validateToken(token);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Token is valid");
            response.put("valid", "true");

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            response.put("valid", "false");

            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Password has been reset successfully. You can now login with your new password.");

        return ResponseEntity.ok(response);
    }
}

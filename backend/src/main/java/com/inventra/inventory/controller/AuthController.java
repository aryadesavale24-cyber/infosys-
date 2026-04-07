package com.inventra.inventory.controller;

import com.inventra.inventory.dto.AuthRequest;
import com.inventra.inventory.dto.AuthResponse;
import com.inventra.inventory.dto.RegisterRequest;
import com.inventra.inventory.dto.UserDTO;
import com.inventra.inventory.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:5173" })
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser() {
        UserDTO user = authService.getCurrentUser();
        return ResponseEntity.ok(user);
    }

    @PostMapping("/force-logout")
    public ResponseEntity<java.util.Map<String, String>> forceLogout(@Valid @RequestBody AuthRequest request) {
        java.util.Map<String, String> response = authService.forceLogoutAndLogin(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-force-logout-otp")
    public ResponseEntity<AuthResponse> verifyForceLogoutOtp(@RequestBody java.util.Map<String, String> payload) {
        String username = payload.get("username");
        String otp = payload.get("otp");
        String password = payload.get("password");
        String selectedRoleStr = payload.get("selectedRole");

        com.inventra.inventory.model.Role selectedRole = null;
        if (selectedRoleStr != null) {
            selectedRole = com.inventra.inventory.model.Role.valueOf(selectedRoleStr);
        }

        AuthRequest request = new AuthRequest();
        request.setUsername(username);
        request.setPassword(password);
        request.setSelectedRole(selectedRole);

        AuthResponse response = authService.verifyForceLogoutOtp(username, otp, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<java.util.Map<String, String>> logout() {
        authService.logout();
        return ResponseEntity.ok(java.util.Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/validate-session")
    public ResponseEntity<java.util.Map<String, Boolean>> validateSession() {
        boolean isValid = authService.validateCurrentSession();
        return ResponseEntity.ok(java.util.Map.of("valid", isValid));
    }
}

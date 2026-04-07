package com.inventra.inventory.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/staff")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:5173" })
public class StaffController {

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, String>> getStaffDashboard() {
        return ResponseEntity.ok(Map.of(
                "message", "Welcome to Staff Dashboard",
                "role", "STAFF"));
    }
}

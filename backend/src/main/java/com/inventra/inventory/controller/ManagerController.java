package com.inventra.inventory.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:5173" })
public class ManagerController {

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, String>> getManagerDashboard() {
        return ResponseEntity.ok(Map.of(
                "message", "Welcome to Manager Dashboard",
                "role", "MANAGER"));
    }
}

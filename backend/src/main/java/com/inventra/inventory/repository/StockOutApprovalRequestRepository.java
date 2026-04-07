package com.inventra.inventory.repository;

import com.inventra.inventory.model.ApprovalStatus;
import com.inventra.inventory.model.StockOutApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockOutApprovalRequestRepository extends JpaRepository<StockOutApprovalRequest, Long> {

    /** All requests raised by a specific staff member, newest first */
    List<StockOutApprovalRequest> findByStaffIdOrderByRequestedAtDesc(Long staffId);

    /** All PENDING requests directed at a specific manager, newest first */
    List<StockOutApprovalRequest> findByManagerIdAndStatusOrderByRequestedAtDesc(Long managerId, ApprovalStatus status);

    /** All requests directed at a specific manager (any status), newest first */
    List<StockOutApprovalRequest> findByManagerIdOrderByRequestedAtDesc(Long managerId);
}

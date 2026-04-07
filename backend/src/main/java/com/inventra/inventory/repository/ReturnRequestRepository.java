package com.inventra.inventory.repository;

import com.inventra.inventory.model.ReturnRequest;
import com.inventra.inventory.model.ReturnStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {

        /** All return requests raised by a specific staff member, newest first */
        List<ReturnRequest> findByStaffIdOrderByRequestedAtDesc(Long staffId);

        /** All PENDING returns directed at a specific manager, newest first */
        List<ReturnRequest> findByManagerIdAndStatusOrderByRequestedAtDesc(Long managerId, ReturnStatus status);

        /** All returns directed at a specific manager (any status) — for history */
        List<ReturnRequest> findByManagerIdOrderByRequestedAtDesc(Long managerId);

        /** All returns for a specific product — for product-level audit view */
        List<ReturnRequest> findByProductIdOrderByRequestedAtDesc(Long productId);

        /** Count of pending returns for a manager — for badge/notification count */
        long countByManagerIdAndStatus(Long managerId, ReturnStatus status);

        /** ADMIN: all return requests across entire system, newest first */
        List<ReturnRequest> findAllByOrderByRequestedAtDesc();

        /** ADMIN: all return requests filtered by status */
        List<ReturnRequest> findByStatusOrderByRequestedAtDesc(ReturnStatus status);
}

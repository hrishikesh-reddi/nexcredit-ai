package com.synchrony.nexcredit.credit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DocumentEvidenceRepository extends JpaRepository<DocumentEvidence, Long> {
    Optional<DocumentEvidence> findTopByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}

package com.synchrony.nexcredit.credit;

import org.apache.tika.Tika;
import org.springframework.stereotype.Service;

import com.synchrony.nexcredit.ai.VectorStore;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DocumentEvidenceService {
    private static final int MAX_PREVIEW_CHARACTERS = 4000;
    private final DocumentEvidenceRepository documentEvidenceRepository;
    private final VectorStore vectorStore;

    public DocumentEvidenceService(DocumentEvidenceRepository documentEvidenceRepository, VectorStore vectorStore) {
        this.documentEvidenceRepository = documentEvidenceRepository;
        this.vectorStore = vectorStore;
    }

    public DocumentEvidence extractAndStore(Long applicationId, String documentPath, String originalFileName) {
        String preview = null;
        String status = "EXTRACTION_FAILED";
        try {
            Tika tika = new Tika();
            tika.setMaxStringLength(MAX_PREVIEW_CHARACTERS);
            preview = normalize(tika.parseToString(Path.of(documentPath).toFile()));
            status = preview.isEmpty() ? "NO_TEXT_DETECTED" : "EXTRACTED";
        } catch (Exception ignored) {
            // An upload remains available to a reviewer even when its text cannot be extracted.
        }
        DocumentEvidence evidence = new DocumentEvidence(applicationId, originalFileName, status, preview);
        evidence.setExtractedAnnualIncome(parseAnnualIncome(preview));
        evidence = documentEvidenceRepository.save(evidence);
        vectorStore.indexEvidence(evidence.getId(), "document", originalFileName, preview);
        return evidence;
    }

    public Optional<DocumentEvidence> getLatestEvidence(Long applicationId) {
        return documentEvidenceRepository.findTopByApplicationIdOrderByCreatedAtDesc(applicationId);
    }

    private String normalize(String extractedText) {
        if (extractedText == null) {
            return "";
        }
        String compact = extractedText.replaceAll("\\s+", " ").trim();
        return compact.length() <= MAX_PREVIEW_CHARACTERS
                ? compact
                : compact.substring(0, MAX_PREVIEW_CHARACTERS);
    }

    private BigDecimal parseAnnualIncome(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Pattern monthly = Pattern.compile(
                "(?i)(?:monthly|per\\s*month|/\\s*month|in\\s*a\\s*month)[^\\d]{0,25}[₹$]?\\s*([\\d,]+(?:\\.\\d+)?)");
        Pattern annual = Pattern.compile(
                "(?i)(?:annual|gross|per\\s*annum|per\\s*year|yearly|ctc)[^\\d]{0,25}[₹$]?\\s*([\\d,]+(?:\\.\\d+)?)");
        Matcher m = monthly.matcher(text);
        if (m.find()) {
            return parseAmount(m.group(1)).multiply(BigDecimal.valueOf(12));
        }
        m = annual.matcher(text);
        if (m.find()) {
            return parseAmount(m.group(1));
        }
        return null;
    }

    private BigDecimal parseAmount(String raw) {
        try {
            return new BigDecimal(raw.replaceAll(",", "").trim());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}

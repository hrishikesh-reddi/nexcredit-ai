package com.synchrony.nexcredit.credit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.synchrony.nexcredit.ai.VectorStore;

class DocumentEvidenceServiceTest {
    @TempDir
    Path temporaryDirectory;

    @Test
    void extracts_a_bounded_text_preview_from_a_supporting_document() throws Exception {
        DocumentEvidenceRepository repository = mock(DocumentEvidenceRepository.class);
        when(repository.save(any(DocumentEvidence.class))).thenAnswer(invocation -> invocation.getArgument(0));
        Path statement = temporaryDirectory.resolve("income-proof.txt");
        Files.writeString(statement, "Income proof: annual income is INR 300000. Employment is stable.");

        DocumentEvidence evidence = new DocumentEvidenceService(repository, mock(VectorStore.class))
                .extractAndStore(9L, statement.toString(), "income-proof.txt");

        assertThat(evidence.getExtractionStatus()).isEqualTo("EXTRACTED");
        assertThat(evidence.getTextPreview()).contains("annual income is INR 300000");
    }
}

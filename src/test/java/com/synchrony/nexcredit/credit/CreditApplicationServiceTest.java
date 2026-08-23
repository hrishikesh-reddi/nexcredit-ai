package com.synchrony.nexcredit.credit;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CreditApplicationServiceTest {

    @Test
    void rejects_a_supporting_document_larger_than_ten_megabytes() {
        CreditApplicationRepository repository = org.mockito.Mockito.mock(CreditApplicationRepository.class);
        CreditApplicationService service = new CreditApplicationService(repository, org.mockito.Mockito.mock(AuditLogService.class), org.mockito.Mockito.mock(CreditUnderwritingService.class));
        MockMultipartFile oversizedFile = new MockMultipartFile(
                "file", "statement.pdf", "application/pdf", new byte[10 * 1024 * 1024 + 1]);

        assertThatThrownBy(() -> service.storeDocument(1L, oversizedFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("10 MB");
    }
}

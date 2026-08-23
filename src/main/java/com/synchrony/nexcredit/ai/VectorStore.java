package com.synchrony.nexcredit.ai;

import com.pgvector.PGvector;
import com.synchrony.nexcredit.credit.DocumentEvidence;
import com.synchrony.nexcredit.credit.DocumentEvidenceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementSetter;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;

@Service
public class VectorStore {

    private static final Logger LOGGER = LoggerFactory.getLogger(VectorStore.class);

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingService embeddingService;
    private final AiProperties props;
    private final DocumentEvidenceRepository documentEvidenceRepository;
    private boolean available = false;

    public VectorStore(JdbcTemplate jdbcTemplate,
                      EmbeddingService embeddingService,
                      AiProperties props,
                      DocumentEvidenceRepository documentEvidenceRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.embeddingService = embeddingService;
        this.props = props;
        this.documentEvidenceRepository = documentEvidenceRepository;
    }

    @PostConstruct
    public void init() {
        if (!props.isVectorEnabled()) {
            LOGGER.info("Vector store disabled by configuration");
            return;
        }
        try {
            jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS evidence_embedding (" +
                    "id BIGINT PRIMARY KEY, source TEXT, type TEXT, content TEXT, " +
                    "embedding vector(" + props.getEmbeddingDim() + "))");
            available = true;
            LOGGER.info("pgvector semantic store is ready");
            reindexAll();
        } catch (Exception e) {
            available = false;
            LOGGER.warn("pgvector unavailable ({}). Semantic search disabled - use a pgvector-enabled PostgreSQL.", e.getMessage());
        }
    }

    public boolean isAvailable() {
        return available;
    }

    public void reindexAll() {
        if (!available) {
            return;
        }
        for (DocumentEvidence evidence : documentEvidenceRepository.findAll()) {
            indexEvidence(evidence.getId(), "document", evidence.getOriginalFileName(), evidence.getTextPreview());
        }
    }

    public void indexEvidence(Long id, String source, String type, String content) {
        if (!available || content == null || content.isBlank()) {
            return;
        }
        double[] embedding = embeddingService.embed(content);
        try {
            PreparedStatementSetter setter = ps -> {
                ps.setLong(1, id);
                ps.setString(2, source);
                ps.setString(3, type);
                ps.setString(4, content);
                ps.setObject(5, new PGvector(toFloatArray(embedding)));
            };
            jdbcTemplate.update(
                    "INSERT INTO evidence_embedding (id, source, type, content, embedding) VALUES (?,?,?,?,?) " +
                            "ON CONFLICT (id) DO UPDATE SET source = EXCLUDED.source, type = EXCLUDED.type, " +
                            "content = EXCLUDED.content, embedding = EXCLUDED.embedding",
                    setter);
        } catch (Exception e) {
            LOGGER.warn("Failed to index evidence {}: {}", id, e.getMessage());
        }
    }

    public List<SearchHit> search(String query, int k) {
        if (!available) {
            return fallbackTextSearch(query, k);
        }
        double[] queryVector = embeddingService.embed(query);
        try {
            return jdbcTemplate.query(con -> {
                PreparedStatement ps = con.prepareStatement(
                        "SELECT id, source, type, content, 1 - (embedding <-> ?::vector) AS score " +
                                "FROM evidence_embedding ORDER BY embedding <-> ?::vector LIMIT ?");
                ps.setObject(1, new PGvector(toFloatArray(queryVector)));
                ps.setObject(2, new PGvector(toFloatArray(queryVector)));
                ps.setInt(3, k);
                return ps;
            }, (rs, rowNum) -> new SearchHit(
                    rs.getLong("id"),
                    rs.getString("source"),
                    rs.getString("type"),
                    rs.getString("content"),
                    rs.getDouble("score")));
        } catch (Exception e) {
            LOGGER.warn("Vector search failed, using text fallback: {}", e.getMessage());
            return fallbackTextSearch(query, k);
        }
    }

    private List<SearchHit> fallbackTextSearch(String query, int k) {
        List<SearchHit> hits = new ArrayList<>();
        if (query == null || query.isBlank()) {
            return hits;
        }
        String[] tokens = query.toLowerCase().split("\\W+");
        for (DocumentEvidence evidence : documentEvidenceRepository.findAll()) {
            String content = evidence.getTextPreview() == null ? "" : evidence.getTextPreview().toLowerCase();
            if (content.isBlank()) {
                continue;
            }
            double score = 0;
            for (String token : tokens) {
                if (!token.isEmpty() && content.contains(token)) {
                    score += 1;
                }
            }
            if (score > 0) {
                hits.add(new SearchHit(evidence.getId(), "document", evidence.getOriginalFileName(), evidence.getTextPreview(), score));
            }
        }
        hits.sort((a, b) -> Double.compare(b.score(), a.score()));
        return hits.size() <= k ? hits : hits.subList(0, k);
    }

    private float[] toFloatArray(double[] vector) {
        float[] out = new float[vector.length];
        for (int i = 0; i < vector.length; i++) {
            out[i] = (float) vector[i];
        }
        return out;
    }
}

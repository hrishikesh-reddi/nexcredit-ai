package com.synchrony.nexcredit.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class EmbeddingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(EmbeddingService.class);

    private final AiProperties props;
    private final RestClient restClient;

    public EmbeddingService(AiProperties props) {
        this.props = props;
        this.restClient = RestClient.builder()
                .baseUrl(props.getEmbeddingBaseUrl())
                .defaultHeader("Authorization", "Bearer " + (props.getApiKey() == null ? "" : props.getApiKey()))
                .build();
    }

    public double[] embed(String text) {
        if (props.isEnabled() && props.getApiKey() != null && !props.getApiKey().isBlank()) {
            try {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("model", props.getEmbeddingModel());
                body.put("input", text == null ? "" : text);
                JsonNode root = restClient.post()
                        .uri("/embeddings")
                        .body(body)
                        .retrieve()
                        .body(JsonNode.class);
                JsonNode data = root.get("data");
                if (data != null && data.isArray() && !data.isEmpty()) {
                    JsonNode embedding = data.get(0).get("embedding");
                    double[] out = new double[embedding.size()];
                    for (int i = 0; i < embedding.size(); i++) {
                        out[i] = embedding.get(i).asDouble();
                    }
                    return out;
                }
            } catch (Exception e) {
                LOGGER.warn("Embedding API call failed, using deterministic local embedding: {}", e.getMessage());
            }
        }
        return localEmbedding(text);
    }

    private double[] localEmbedding(String text) {
        int dim = props.getEmbeddingDim();
        double[] vector = new double[dim];
        if (text == null || text.isBlank()) {
            return vector;
        }
        for (String token : text.toLowerCase().split("\\W+")) {
            if (token.isEmpty()) {
                continue;
            }
            int index = Math.floorMod(token.hashCode(), dim);
            vector[index] += 1.0;
        }
        double norm = 0.0;
        for (double value : vector) {
            norm += value * value;
        }
        norm = Math.sqrt(norm);
        if (norm > 0.0) {
            for (int i = 0; i < dim; i++) {
                vector[i] /= norm;
            }
        }
        return vector;
    }
}

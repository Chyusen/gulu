-- ============================================================
-- 咕噜 Gulu — pgvector 内容匹配函数
-- 对应 tech-plan-2026 方案一
-- ============================================================

-- 基于向量相似度检索内容
CREATE OR REPLACE FUNCTION match_contents(
    p_embedding vector(1024),
    p_top_k INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    platform TEXT,
    external_id TEXT,
    title TEXT,
    summary TEXT,
    tags TEXT[],
    likes INTEGER,
    location TEXT,
    cover_url TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.platform,
        c.external_id,
        c.title,
        c.summary,
        c.tags,
        c.likes,
        c.location,
        c.cover_url,
        1 - (c.embedding <=> p_embedding) AS similarity
    FROM content_items c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> p_embedding
    LIMIT p_top_k;
END;
$$ LANGUAGE plpgsql;

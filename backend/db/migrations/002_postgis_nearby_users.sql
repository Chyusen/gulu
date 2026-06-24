-- ============================================================
-- 咕噜 Gulu — PostGIS 附近用户查询函数
-- 对应 tech-plan-2026 方案二
-- ============================================================

-- 查询半径内用户（基于 PostGIS）
CREATE OR REPLACE FUNCTION find_nearby_users(
    p_lng DOUBLE PRECISION,
    p_lat DOUBLE PRECISION,
    p_radius INTEGER,
    p_exclude TEXT DEFAULT ''
)
RETURNS TABLE (
    user_id UUID,
    lng DOUBLE PRECISION,
    lat DOUBLE PRECISION,
    distance DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ul.user_id,
        ul.lng,
        ul.lat,
        ST_Distance(
            ul.geom,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) AS distance
    FROM user_locations ul
    WHERE
        (p_exclude = '' OR ul.user_id::TEXT != p_exclude)
        AND ST_DWithin(
            ul.geom,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
            p_radius
        )
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 咕噜 Gulu — 三大技术板块迁移文件
-- 对应 tech-plan-2026/tech-plan-2026.html
-- 1. AI 生成形象（image_generation_tasks 扩展 + user_generation_quota）
-- 2. 高德地图集成（user_locations + PostGIS）
-- 3. 小红书攻略推荐（content_items + pgvector）
-- ============================================================

-- ========== 扩展 ==========
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 1. AI 生成形象
-- ============================================================

-- 扩展 image_generation_tasks 表（若已存在则补字段）
ALTER TABLE image_generation_tasks ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE image_generation_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE image_generation_tasks ADD COLUMN IF NOT EXISTS user_description TEXT;

-- 用户每日生成次数配额表
CREATE TABLE IF NOT EXISTS user_generation_quota (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_count INTEGER NOT NULL DEFAULT 0,
    max_count INTEGER NOT NULL DEFAULT 3,
    reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (user_id, reset_date)
);

-- ============================================================
-- 2. 高德地图集成
-- ============================================================

-- 用户实时位置表（PostGIS）
CREATE TABLE IF NOT EXISTS user_locations (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    lng DOUBLE PRECISION NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(POINT, 4326),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 建立空间索引以加速附近用户查询
CREATE INDEX IF NOT EXISTS idx_user_locations_geom ON user_locations USING GIST (geom);

-- 触发器：写入/更新时自动计算 geom
CREATE OR REPLACE FUNCTION update_user_location_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_locations_geom ON user_locations;
CREATE TRIGGER user_locations_geom BEFORE INSERT OR UPDATE ON user_locations
    FOR EACH ROW EXECUTE FUNCTION update_user_location_geom();

-- ============================================================
-- 3. 小红书攻略推荐
-- ============================================================

-- 内容表（小红书/抖音采集结果）
CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('xhs', 'douyin')),
    external_id TEXT NOT NULL,
    title TEXT,
    summary TEXT,
    tags TEXT[] DEFAULT '{}',
    likes INTEGER NOT NULL DEFAULT 0,
    location TEXT,
    cover_url TEXT,
    embedding vector(1024),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(platform, external_id)
);

-- 向量相似度索引（cosine）
CREATE INDEX IF NOT EXISTS idx_content_items_embedding ON content_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_content_items_platform ON content_items(platform);
CREATE INDEX IF NOT EXISTS idx_content_items_created ON content_items(created_at DESC);

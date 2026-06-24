-- ============================================================
-- 咕噜 Gulu 数据库 Schema
-- 对应需求文档 1.1.6 数据库设计
-- ============================================================

-- 启用 pgcrypto 扩展以使用 gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    nickname TEXT NOT NULL DEFAULT '咕噜主人',
    avatar_url TEXT,
    mbti TEXT,
    zodiac TEXT,
    birth_date DATE,
    privacy_level INTEGER NOT NULL DEFAULT 1 CHECK (privacy_level IN (1, 2, 3)),
    is_minor BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 宠物表
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '咕噜',
    personality_type TEXT NOT NULL DEFAULT 'dreamer',
    current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage IN (1, 2, 3)),
    energy_level INTEGER NOT NULL DEFAULT 80 CHECK (energy_level BETWEEN 0 AND 100),
    max_energy INTEGER NOT NULL DEFAULT 100,
    is_graying BOOLEAN NOT NULL DEFAULT FALSE,
    graying_severity INTEGER NOT NULL DEFAULT 0 CHECK (graying_severity BETWEEN 0 AND 5),
    is_dormant BOOLEAN NOT NULL DEFAULT FALSE,
    style TEXT NOT NULL DEFAULT 'anime',
    custom_description TEXT,
    voice_type TEXT NOT NULL DEFAULT 'cute_child',
    voice_speed REAL NOT NULL DEFAULT 1.0,
    current_emotion TEXT NOT NULL DEFAULT 'normal',
    image_url TEXT,
    action_closure_count INTEGER NOT NULL DEFAULT 0,
    graying_experienced BOOLEAN NOT NULL DEFAULT FALSE,
    graying_healed BOOLEAN NOT NULL DEFAULT FALSE,
    collectibles JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_interaction TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

-- 对话记录表（原 messages 表，对齐需求文档命名）
-- 字段 message 对应需求文档；服务层兼容读取 content
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    emotion_tag TEXT,
    action_closure JSONB,
    is_action_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_pet ON conversations(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);

-- 行动闭环表
-- action_type 枚举统一为需求文档定义：citywalk | social | selfcare | explore
CREATE TABLE IF NOT EXISTS action_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    action_text TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('citywalk', 'social', 'selfcare', 'explore')),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_rejected BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_user ON action_closures(user_id);

-- 喂食记录表
CREATE TABLE IF NOT EXISTS feed_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    feed_type TEXT NOT NULL CHECK (feed_type IN ('sunlight', 'moonlight', 'soul_feast', 'forget_grass')),
    energy_gain INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_pet ON feed_logs(pet_id);

-- 收集元素表
CREATE TABLE IF NOT EXISTS collectibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    element_type TEXT NOT NULL,
    element_name TEXT NOT NULL,
    rarity TEXT NOT NULL DEFAULT 'common',
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_collectibles_pet ON collectibles(pet_id);

-- Citywalk 会话表
CREATE TABLE IF NOT EXISTS citywalk_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    start_lat REAL NOT NULL,
    start_lng REAL NOT NULL,
    end_lat REAL,
    end_lng REAL,
    status TEXT NOT NULL DEFAULT 'walking' CHECK (status IN ('walking', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_walks_user ON citywalk_sessions(user_id);

-- Citywalk 打卡表
CREATE TABLE IF NOT EXISTS citywalk_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES citywalk_sessions(id) ON DELETE CASCADE,
    poi_id TEXT,
    poi_name TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    pet_dialogue TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_session ON citywalk_checkins(session_id);

-- 宠物社交记录表（原 social_interactions 表，对齐需求文档命名）
-- interaction_type 枚举对齐需求文档：meet | play | gift | explore
CREATE TABLE IF NOT EXISTS pet_social (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    target_pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('meet', 'play', 'gift', 'explore')),
    gift_type VARCHAR(50),
    location_lat REAL,
    location_lng REAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_social_from ON pet_social(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_social_to ON pet_social(target_pet_id);

-- 宠物位置表（社交发现）
CREATE TABLE IF NOT EXISTS pet_locations (
    pet_id UUID PRIMARY KEY REFERENCES pets(id) ON DELETE CASCADE,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 物品/皮肤表（原 shop_items 表，对齐需求文档命名）
-- item_type 枚举对齐需求文档：skin | scene | gift | effect
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('skin', 'scene', 'gift', 'effect')),
    price INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'coin' CHECK (currency IN ('coin', 'energy', 'star_dust', 'real_money')),
    style TEXT,
    description TEXT,
    image_url TEXT,
    is_limited BOOLEAN NOT NULL DEFAULT FALSE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户物品表（原 user_inventory 表，对齐需求文档命名）
CREATE TABLE IF NOT EXISTS user_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id);

-- ============================================================
-- 引导流程与主界面重构 v2.0 新增表
-- 对应需求文档 第三章 Step 6 基因注入 / AI 形象生成
-- ============================================================

-- AI 图像生成任务表（异步生成宠物形象）
CREATE TABLE IF NOT EXISTS image_generation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    style TEXT NOT NULL,
    custom_prompt TEXT,
    prompt_used TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    image_url TEXT,
    error_msg TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_tasks_user ON image_generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_image_tasks_status ON image_generation_tasks(status);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS pets_updated_at ON pets;
CREATE TRIGGER pets_updated_at BEFORE UPDATE ON pets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS image_tasks_updated_at ON image_generation_tasks;
CREATE TRIGGER image_tasks_updated_at BEFORE UPDATE ON image_generation_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 宠物进化与核心机制重构 v3.0 新增
-- 对应需求文档 二/三/四/六章
-- ============================================================

-- ========== users 表新增字段 ==========
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'undisclosed'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS gulu_coin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS star_dust INTEGER NOT NULL DEFAULT 0;

-- ========== pets 表新增字段（三维数值 + 进化） ==========
ALTER TABLE pets ADD COLUMN IF NOT EXISTS stamina INTEGER NOT NULL DEFAULT 100;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS max_stamina INTEGER NOT NULL DEFAULT 100;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS intimacy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS max_intimacy INTEGER NOT NULL DEFAULT 300;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS total_energy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS max_total_energy INTEGER NOT NULL DEFAULT 500;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS preferred_foods JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS stage_number INTEGER NOT NULL DEFAULT 1 CHECK (stage_number IN (1, 2, 3));

-- ========== 每日任务表 ==========
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('chat', 'feed', 'explore', 'companion', 'social')),
    description TEXT NOT NULL,
    current_progress INTEGER NOT NULL DEFAULT 0,
    target_progress INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user ON daily_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_expires ON daily_tasks(expires_at);

-- ========== 每周任务表 ==========
CREATE TABLE IF NOT EXISTS weekly_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('explore', 'chat', 'companion')),
    description TEXT NOT NULL,
    current_progress INTEGER NOT NULL DEFAULT 0,
    target_progress INTEGER NOT NULL,
    base_reward INTEGER NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_user ON weekly_tasks(user_id);

-- ========== 任务连击记录表 ==========
CREATE TABLE IF NOT EXISTS task_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    streak_days INTEGER NOT NULL DEFAULT 0,
    last_complete_date DATE,
    week_daily_all_done JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ========== 宠物自主探索表 ==========
CREATE TABLE IF NOT EXISTS auto_explores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_hours INTEGER NOT NULL,
    estimated_stamina_cost INTEGER NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_auto_explores_pet ON auto_explores(pet_id);

-- ========== 咕噜悄悄话表 ==========
CREATE TABLE IF NOT EXISTS gulu_whispers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    story TEXT NOT NULL,
    personality_tag TEXT NOT NULL CHECK (personality_tag IN ('social', 'solo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whispers_pet ON gulu_whispers(pet_id);

-- ========== 好友表 ==========
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);

-- ========== 拉黑表 ==========
CREATE TABLE IF NOT EXISTS block_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_block_user ON block_list(user_id);

-- ========== 举报表 ==========
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('harassment', 'ad', 'inappropriate', 'other')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 货币变动日志表 ==========
CREATE TABLE IF NOT EXISTS currency_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency_type TEXT NOT NULL CHECK (currency_type IN ('gulu_coin', 'star_dust')),
    amount INTEGER NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('add', 'spend')),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_currency_logs_user ON currency_logs(user_id);

-- ========== 探索隐私设置表 ==========
CREATE TABLE IF NOT EXISTS explore_privacy (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    show_gender BOOLEAN NOT NULL DEFAULT FALSE,
    show_mbti BOOLEAN NOT NULL DEFAULT FALSE,
    show_zodiac BOOLEAN NOT NULL DEFAULT FALSE,
    first_visit_done BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 喂食记录表（新版食物系统） ==========
CREATE TABLE IF NOT EXISTS feed_logs_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    food_id TEXT NOT NULL,
    food_quality TEXT NOT NULL CHECK (food_quality IN ('common', 'fine', 'rare')),
    is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
    stamina_gained INTEGER NOT NULL,
    intimacy_gained INTEGER NOT NULL,
    gulu_coin_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_logs_v2_pet ON feed_logs_v2(pet_id);

-- ========== 每日基础食物限额表 ==========
CREATE TABLE IF NOT EXISTS daily_basic_food_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    used_date DATE NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, pet_id, used_date)
);

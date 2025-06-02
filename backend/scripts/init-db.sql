-- 美妆AI助手数据库初始化脚本
-- 创建数据库和基础配置

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS beauty_ai_db;

-- 使用数据库
\c beauty_ai_db;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建分析任务表
CREATE TABLE IF NOT EXISTS analysis_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'image')),
    content TEXT,
    file_path VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    result JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建违禁词库表
CREATE TABLE IF NOT EXISTS forbidden_words (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    severity INTEGER DEFAULT 1 CHECK (severity IN (1, 2, 3)),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建API调用日志表
CREATE TABLE IF NOT EXISTS api_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    duration INTEGER NOT NULL, -- 毫秒
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_user_id ON analysis_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_status ON analysis_tasks(status);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_type ON analysis_tasks(type);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_created_at ON analysis_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_forbidden_words_word ON forbidden_words(word);
CREATE INDEX IF NOT EXISTS idx_forbidden_words_category ON forbidden_words(category);
CREATE INDEX IF NOT EXISTS idx_forbidden_words_is_active ON forbidden_words(is_active);
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);

-- 创建全文搜索索引
CREATE INDEX IF NOT EXISTS idx_forbidden_words_word_gin ON forbidden_words USING gin(word gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_content_gin ON analysis_tasks USING gin(content gin_trgm_ops);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_analysis_tasks_updated_at ON analysis_tasks;
CREATE TRIGGER update_analysis_tasks_updated_at
    BEFORE UPDATE ON analysis_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forbidden_words_updated_at ON forbidden_words;
CREATE TRIGGER update_forbidden_words_updated_at
    BEFORE UPDATE ON forbidden_words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_configs_updated_at ON system_configs;
CREATE TRIGGER update_system_configs_updated_at
    BEFORE UPDATE ON system_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建视图：用户分析统计
CREATE OR REPLACE VIEW user_analysis_stats AS
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(at.id) as total_tasks,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN at.status = 'failed' THEN 1 END) as failed_tasks,
    COUNT(CASE WHEN at.type = 'text' THEN 1 END) as text_tasks,
    COUNT(CASE WHEN at.type = 'image' THEN 1 END) as image_tasks,
    MAX(at.created_at) as last_analysis_at
FROM users u
LEFT JOIN analysis_tasks at ON u.id = at.user_id
GROUP BY u.id, u.username, u.email;

-- 创建视图：违禁词统计
CREATE OR REPLACE VIEW forbidden_word_stats AS
SELECT 
    category,
    COUNT(*) as total_words,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_words,
    COUNT(CASE WHEN severity = 1 THEN 1 END) as low_severity,
    COUNT(CASE WHEN severity = 2 THEN 1 END) as medium_severity,
    COUNT(CASE WHEN severity = 3 THEN 1 END) as high_severity
FROM forbidden_words
GROUP BY category;

-- 创建视图：API调用统计
CREATE OR REPLACE VIEW api_call_stats AS
SELECT 
    endpoint,
    method,
    COUNT(*) as total_calls,
    AVG(duration) as avg_duration,
    MIN(duration) as min_duration,
    MAX(duration) as max_duration,
    COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as success_calls,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_calls
FROM api_logs
GROUP BY endpoint, method;

COMMIT;

-- 输出初始化完成信息
\echo '数据库初始化完成！';
\echo '请运行以下命令完成设置：';
\echo '1. npm run db:push  # 同步数据库结构';
\echo '2. npm run db:seed  # 初始化种子数据';
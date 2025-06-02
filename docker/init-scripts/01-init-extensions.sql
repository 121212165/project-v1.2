-- 美妆AI助手数据库初始化脚本
-- 创建必要的PostgreSQL扩展

-- 连接到目标数据库
\c beauty_ai_db;

-- 创建UUID扩展（用于生成UUID）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建pg_trgm扩展（用于全文搜索和模糊匹配）
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建btree_gin扩展（用于复合索引优化）
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 创建pg_stat_statements扩展（用于查询性能分析）
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 输出扩展创建完成信息
\echo '数据库扩展创建完成！';
\echo '已安装扩展:';
\echo '- uuid-ossp: UUID生成';
\echo '- pg_trgm: 全文搜索和模糊匹配';
\echo '- btree_gin: 复合索引优化';
\echo '- pg_stat_statements: 查询性能分析';
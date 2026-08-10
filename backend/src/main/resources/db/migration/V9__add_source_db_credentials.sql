-- ================================================================
-- RIMS Decommission - 源数据库补充连接字段
-- Flyway Migration V9__add_source_db_credentials.sql
-- 为 r_source_database 补充端口、账号、密码等连接信息
-- ================================================================

ALTER TABLE `r_source_database`
    ADD COLUMN `port` INT NOT NULL DEFAULT 0 COMMENT '端口',
    ADD COLUMN `username` VARCHAR(128) DEFAULT NULL COMMENT '账号',
    ADD COLUMN `password` VARCHAR(256) DEFAULT NULL COMMENT '密码（加密存储）';

-- 更新既有种子数据的端口（可选）
UPDATE `r_source_database`
SET `port` = CASE `db_type`
    WHEN 'POSTGRESQL' THEN 5432
    WHEN 'ORACLE' THEN 1521
    WHEN 'SQLSERVER' THEN 1433
    WHEN 'MYSQL' THEN 3306
    WHEN 'MONGODB' THEN 27017
    ELSE 0 END
WHERE `port` = 0;

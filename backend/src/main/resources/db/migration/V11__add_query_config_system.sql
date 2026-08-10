-- ================================================================
-- RIMS Decommission - Query Config 归属 System
-- Flyway Migration V11__add_query_config_system.sql
-- ================================================================

ALTER TABLE `r_query_config`
    ADD COLUMN `system_id` VARCHAR(64) DEFAULT NULL COMMENT '所属系统ID（r_system.id）';

ALTER TABLE `r_query_config`
    ADD KEY `idx_r_query_config_system` (`system_id`);

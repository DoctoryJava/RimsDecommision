-- ================================================================
-- RIMS Decommission - 移除 Tags 功能
-- Flyway Migration V15__drop_tag_tables.sql
-- 删除 Tags 菜单对应的 r_tag / r_object_tag 表
-- ================================================================

DROP TABLE IF EXISTS `r_object_tag`;
DROP TABLE IF EXISTS `r_tag`;

-- ================================================================
-- RIMS Decommission 初始数据
-- Flyway Migration V2__init_data.sql
-- ================================================================

-- 插入超级管理员 (密码: admin123, BCrypt 加密)
INSERT INTO `sys_user` (`id`, `username`, `password`, `real_name`, `email`, `status`)
VALUES (1, 'admin', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '系统管理员', 'admin@rims.com', 1);

-- 插入默认角色
INSERT INTO `sys_role` (`id`, `role_name`, `role_code`, `description`, `status`) VALUES
(1, '超级管理员', 'SUPER_ADMIN', '拥有所有权限', 1),
(2, '系统管理员', 'SYSTEM_ADMIN', '管理退役系统配置', 1),
(3, '数据操作员', 'DATA_OPERATOR', '执行数据同步任务', 1),
(4, '审计员', 'AUDITOR', '查看审计日志和同步记录', 1);

-- 绑定超级管理员角色
INSERT INTO `sys_user_role` (`id`, `user_id`, `role_id`) VALUES (1, 1, 1);

-- 插入默认菜单
INSERT INTO `sys_menu` (`id`, `parent_id`, `menu_name`, `menu_type`, `path`, `component`, `icon`, `sort_order`, `visible`, `status`) VALUES
-- 一级菜单
(1,  0, '仪表盘',     1, '/dashboard',           'views/dashboard/index',        'Odometer',       1, 1, 1),
(2,  0, '系统管理',   1, '/system',              '',                              'Setting',        2, 1, 1),
(3,  0, '退役管理',   1, '/decommission',        '',                              'Box',            3, 1, 1),
(4,  0, '审计中心',   1, '/audit',               '',                              'Document',       4, 1, 1),

-- 系统管理子菜单
(21, 2, '用户管理',   2, '/system/user',         'views/system/user/index',      'User',           1, 1, 1),
(22, 2, '角色管理',   2, '/system/role',         'views/system/role/index',      'UserFilled',     2, 1, 1),
(23, 2, '菜单管理',   2, '/system/menu',         'views/system/menu/index',      'Menu',           3, 1, 1),
(24, 2, '权限管理',   2, '/system/permission',   'views/system/permission/index','Lock',           4, 1, 1),

-- 退役管理子菜单
(31, 3, '系统列表',   2, '/decommission/systems',        'views/decommission/systems/index',       'List',          1, 1, 1),
(32, 3, '数据库配置', 2, '/decommission/db-config',      'views/decommission/db-config/index',     'Connection',    2, 1, 1),
(33, 3, '存储配置',   2, '/decommission/storage-config',  'views/decommission/storage-config/index','Coin',          3, 1, 1),
(34, 3, 'Schema映射', 2, '/decommission/schema-mapping',  'views/decommission/schema-mapping/index','Grid',          4, 1, 1),
(35, 3, '同步监控',   2, '/decommission/sync-monitor',    'views/decommission/sync-monitor/index',  'Monitor',       5, 1, 1),

-- 审计中心子菜单
(41, 4, '操作日志',   2, '/audit/operation-log',  'views/audit/operation-log/index',  'Notebook',     1, 1, 1),
(42, 4, '同步记录',   2, '/audit/sync-history',   'views/audit/sync-history/index',   'DataLine',     2, 1, 1);

-- 超级管理员绑定所有菜单
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`) VALUES
(1, 1, 1), (2, 1, 2), (3, 1, 3), (4, 1, 4),
(5, 1, 21), (6, 1, 22), (7, 1, 23), (8, 1, 24),
(9, 1, 31), (10, 1, 32), (11, 1, 33), (12, 1, 34), (13, 1, 35),
(14, 1, 41), (15, 1, 42);

-- 数据操作员菜单（退役管理 + 仪表盘）
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`) VALUES
(16, 3, 1), (17, 3, 3),
(18, 3, 31), (19, 3, 35);

-- 审计员菜单（审计中心 + 仪表盘）
INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`) VALUES
(20, 4, 1), (21, 4, 4),
(22, 4, 41), (23, 4, 42);

-- ================================================================
-- RIMS Decommission 初始数据
-- Flyway Migration V2__init_data.sql（SQL Server 版）
-- 数据库：Microsoft SQL Server 2019+（T-SQL）
-- ================================================================

-- 插入超级管理员 (密码: admin123, BCrypt 加密)
INSERT INTO [sys_user] ([id], [username], [password], [real_name], [email], [status])
VALUES (1, 'admin', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', N'系统管理员', 'admin@rims.com', 1);

-- 插入默认角色
INSERT INTO [sys_role] ([id], [role_name], [role_code], [description], [status]) VALUES
(1, N'超级管理员', 'SUPER_ADMIN',   N'拥有所有权限，管理全部系统', 1),
(2, N'系统管理员', 'SYSTEM_ADMIN',  N'管理退役系统配置与同步任务', 1),
(3, N'数据操作员', 'DATA_OPERATOR', N'发起同步任务、查询归档数据', 1),
(4, N'审计员',     'AUDITOR',       N'查看审计日志与同步记录（只读）', 1),
(5, N'查询用户',   'VIEWER',        N'仅查询授权系统的归档数据', 1);

-- 绑定管理员角色
INSERT INTO [sys_user_role] ([id], [user_id], [role_id]) VALUES (1, 1, 1);

-- 插入默认菜单
INSERT INTO [sys_menu] ([id], [parent_id], [menu_name], [menu_type], [path], [component], [icon], [sort_order], [visible], [status], [permission_code]) VALUES
-- 一级菜单
(1,  0, N'仪表盘',     1, '/dashboard',            'views/dashboard/index',         'Odometer',    1, 1, 1, NULL),
(2,  0, N'系统管理',   1, '/system',               '',                               'Setting',     2, 1, 1, NULL),
(3,  0, N'退役管理',   1, '/decommission',         '',                               'Box',         3, 1, 1, NULL),
(4,  0, N'审计中心',   1, '/audit',                '',                               'Document',    4, 1, 1, NULL),

-- 系统管理子菜单
(21, 2, N'用户管理',   2, '/system/user',          'views/system/user/index',       'User',        1, 1, 1, 'system:user:list'),
(22, 2, N'角色管理',   2, '/system/role',          'views/system/role/index',       'UserFilled',  2, 1, 1, 'system:role:list'),
(23, 2, N'菜单管理',   2, '/system/menu',          'views/system/menu/index',       'Menu',        3, 1, 1, 'system:menu:list'),
(24, 2, N'权限管理',   2, '/system/permission',    'views/system/permission/index', 'Lock',        4, 1, 1, 'system:perm:list'),

-- 退役管理子菜单
(31, 3, N'系统列表',     2, '/decommission/systems',          'views/decommission/systems/index',          'List',       1, 1, 1, 'decomm:system:list'),
(32, 3, N'系统配置',     2, '/decommission/system-config',    'views/decommission/system-config/index',    'SetUp',      2, 1, 1, 'decomm:system:config'),
(33, 3, N'Schema管理',   2, '/decommission/schema-registry',  'views/decommission/schema-registry/index',  'Grid',       3, 1, 1, 'decomm:schema:list'),
(34, 3, N'同步监控',     2, '/decommission/sync-monitor',     'views/decommission/sync-monitor/index',     'Monitor',    4, 1, 1, 'decomm:sync:list'),
(35, 3, N'归档查询',     2, '/decommission/archive-query',    'views/decommission/archive-query/index',    'Search',     5, 1, 1, 'decomm:archive:query'),
(36, 3, N'生命周期',     2, '/decommission/lifecycle',        'views/decommission/lifecycle/index',        'Timer',      6, 1, 1, 'decomm:lifecycle:list'),

-- 审计中心子菜单
(41, 4, N'操作日志',   2, '/audit/operation-log',  'views/audit/operation-log/index',  'Notebook',  1, 1, 1, 'audit:log:list'),
(42, 4, N'同步记录',   2, '/audit/sync-history',   'views/audit/sync-history/index',   'DataLine',  2, 1, 1, 'audit:sync:list');

-- 按钮级权限 (menu_type=3)
INSERT INTO [sys_menu] ([id], [parent_id], [menu_name], [menu_type], [path], [component], [icon], [sort_order], [visible], [status], [permission_code]) VALUES
(211, 21, N'新增用户', 3, '', '', '', 1, 1, 1, 'system:user:create'),
(212, 21, N'编辑用户', 3, '', '', '', 2, 1, 1, 'system:user:update'),
(213, 21, N'删除用户', 3, '', '', '', 3, 1, 1, 'system:user:delete'),
(221, 22, N'新增角色', 3, '', '', '', 1, 1, 1, 'system:role:create'),
(222, 22, N'编辑角色', 3, '', '', '', 2, 1, 1, 'system:role:update'),
(311, 31, N'注册系统', 3, '', '', '', 1, 1, 1, 'decomm:system:create'),
(312, 31, N'删除系统', 3, '', '', '', 2, 1, 1, 'decomm:system:delete'),
(341, 34, N'发起同步', 3, '', '', '', 1, 1, 1, 'decomm:sync:create'),
(342, 34, N'取消同步', 3, '', '', '', 2, 1, 1, 'decomm:sync:cancel'),
(361, 36, N'确认销毁', 3, '', '', '', 1, 1, 1, 'decomm:lifecycle:destroy');

-- 超级管理员绑定所有菜单
-- MySQL 版用 (@rownum := @rownum + 1) 生成自增 id，SQL Server 用 ROW_NUMBER() 窗口函数
INSERT INTO [sys_role_menu] ([id], [role_id], [menu_id])
SELECT ROW_NUMBER() OVER (ORDER BY [id]) AS [id], 1, [id]
FROM [sys_menu];

-- 系统管理员菜单 (排除用户/角色/权限管理)
INSERT INTO [sys_role_menu] ([id], [role_id], [menu_id]) VALUES
(101, 2, 1), (102, 2, 3), (103, 2, 4),
(104, 2, 31), (105, 2, 32), (106, 2, 33), (107, 2, 34), (108, 2, 35), (109, 2, 36),
(110, 2, 41), (111, 2, 42),
(112, 2, 311), (113, 2, 312), (114, 2, 341), (115, 2, 342), (116, 2, 361);

-- 数据操作员菜单 (退役管理 + 仪表盘)
INSERT INTO [sys_role_menu] ([id], [role_id], [menu_id]) VALUES
(201, 3, 1), (202, 3, 3),
(203, 3, 31), (204, 3, 34), (205, 3, 35),
(206, 3, 341), (207, 3, 342);

-- 审计员菜单 (审计中心 + 仪表盘)
INSERT INTO [sys_role_menu] ([id], [role_id], [menu_id]) VALUES
(301, 4, 1), (302, 4, 4),
(303, 4, 41), (304, 4, 42);

-- 查询用户菜单 (仅归档查询 + 仪表盘)
INSERT INTO [sys_role_menu] ([id], [role_id], [menu_id]) VALUES
(401, 5, 1), (402, 5, 35);

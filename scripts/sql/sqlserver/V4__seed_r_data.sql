-- ================================================================
-- RIMS Decommission - 业务种子数据（由 MockStore/mockData.ts 迁移而来）
-- Flyway Migration V4__seed_r_data.sql（SQL Server 版）
-- 密码统一为 demo1234（BCrypt: $2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW）
-- ================================================================

-- ========== 用户（8 个） ==========
INSERT INTO [r_user] ([id],[name],[email],[password],[avatar],[role_code],[category],[system_ids],[status],[last_login]) VALUES
('u-001','Sarah Chen','sarah.chen@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','SC','super_admin','admin',N'[]','active','2026-08-06 08:42'),
('u-002','Robert Kim','robert.kim@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','RK','platform_admin','admin',N'[]','active','2026-08-06 07:30'),
('u-003','Emily Davis','emily.davis@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','ED','security_admin','admin',N'[]','active','2026-08-05 17:00'),
('u-004','Marcus Wong','marcus.wong@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','MW','system_owner','tenant',N'["sys-002","sys-004"]','active','2026-08-05 16:20'),
('u-005','Priya Patel','priya.patel@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','PP','system_engineer','tenant',N'["sys-003","sys-005"]','active','2026-08-06 07:15'),
('u-006','James Liu','james.liu@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','JL','system_engineer','tenant',N'["sys-001","sys-006"]','active','2026-08-04 11:30'),
('u-007','Diana Ruiz','diana.ruiz@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','DR','system_auditor','tenant',N'["sys-001","sys-003","sys-005"]','active','2026-08-05 09:00'),
('u-008','Tom Anderson','tom.anderson@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','TA','system_viewer','tenant',N'["sys-006"]','disabled','2026-07-15 14:22');


-- ========== 角色（7 个） ==========
INSERT INTO [r_role] ([id],[role_key],[name],[description],[user_count],[permissions],[category],[color],[is_builtin]) VALUES
('r-001','super_admin','Super Administrator','Full unrestricted access to all platform features, systems, and configuration',1,N'["*"]','admin','primary',1),
('r-002','platform_admin','Platform Administrator','Manage all systems, users, and global configuration. Cannot manage security policies.',1,N'["systems.view","systems.create","systems.edit","systems.delete","users.view","users.create","users.edit","users.delete","roles.view","roles.create","roles.edit","data.view","data.sync","data.edit","data.export","pages.view","pages.edit","settings.view","settings.edit"]','admin','secondary',1),
('r-003','security_admin','Security Administrator','Manage roles, permissions, security policies, and audit logs. No data access.',1,N'["roles.view","roles.create","roles.edit","roles.delete","users.view","users.edit","pages.view","pages.edit","settings.view"]','admin','error',1),
('r-004','system_owner','System Owner (Tenant)','Full access to assigned systems: view data, trigger syncs, manage system config. Scoped to assigned systems only.',1,N'["tenant.systems.view","tenant.systems.edit","tenant.data.view","tenant.data.sync","tenant.data.export","tenant.schemas.view"]','tenant','secondary',1),
('r-005','system_engineer','System Engineer (Tenant)','Configure DB/storage connections and run data syncs for assigned systems. Scoped to assigned systems only.',2,N'["tenant.systems.view","tenant.data.view","tenant.data.sync","tenant.data.edit","tenant.schemas.view"]','tenant','accent',1),
('r-006','system_auditor','System Auditor (Tenant)','Read-only access to archived data and sync history for assigned systems. Scoped to assigned systems only.',1,N'["tenant.systems.view","tenant.data.view","tenant.data.export","tenant.schemas.view"]','tenant','warning',1),
('r-007','system_viewer','System Viewer (Tenant)','View system overview and basic metadata for assigned systems. No data access.',1,N'["tenant.systems.view"]','tenant','neutral',1);


-- ========== 权限（27 个） ==========
INSERT INTO [r_permission] ([id],[code],[name],[module],[action],[category],[description]) VALUES
('p-001','systems.view','View All Systems','systems','view','admin','View all systems across the platform'),
('p-002','systems.create','Create System','systems','create','admin','Register a new system in the platform'),
('p-003','systems.edit','Edit System','systems','edit','admin','Modify system metadata and lifecycle stage'),
('p-004','systems.delete','Delete System','systems','delete','admin','Permanently remove a system record'),
('p-005','users.view','View Users','users','view','admin','View all platform users'),
('p-006','users.create','Create User','users','create','admin','Invite a new user to the platform'),
('p-007','users.edit','Edit User','users','edit','admin','Modify user roles and system assignments'),
('p-008','users.delete','Delete User','users','delete','admin','Remove a user account'),
('p-009','roles.view','View Roles','roles','view','admin','View role definitions'),
('p-010','roles.create','Create Role','roles','create','admin','Define a new role'),
('p-011','roles.edit','Edit Role','roles','edit','admin','Modify role permissions'),
('p-012','roles.delete','Delete Role','roles','delete','admin','Remove a role'),
('p-013','data.view','View All Data','data','view','admin','Browse synced schemas and tables across all systems'),
('p-014','data.sync','Trigger Sync','data','sync','admin','Start a Databricks sync job for any system'),
('p-015','data.edit','Edit Schema','data','edit','admin','Modify schema mappings and retention rules globally'),
('p-016','data.export','Export Data','data','export','admin','Export archived data for any system'),
('p-017','pages.view','View Pages','pages','view','admin','View page management'),
('p-018','pages.edit','Edit Pages','pages','edit','admin','Configure page visibility and ordering'),
('p-019','settings.view','View Settings','settings','view','admin','View global platform settings'),
('p-020','settings.edit','Edit Settings','settings','edit','admin','Modify Databricks connection and global config'),
('p-021','tenant.systems.view','View Assigned Systems','systems','view','tenant','View systems assigned to the user (tenant scope)'),
('p-022','tenant.systems.edit','Edit Assigned Systems','systems','edit','tenant','Modify config for assigned systems only'),
('p-023','tenant.data.view','View System Data','data','view','tenant','Browse schemas and tables for assigned systems only'),
('p-024','tenant.data.sync','Trigger System Sync','data','sync','tenant','Start a Databricks sync for assigned systems only'),
('p-025','tenant.data.edit','Edit System Schema','data','edit','tenant','Modify schema mappings for assigned systems only'),
('p-026','tenant.data.export','Export System Data','data','export','tenant','Export archived data for assigned systems only'),
('p-027','tenant.schemas.view','View System Schemas','schemas','view','tenant','Browse schema structure for assigned systems only');


-- ========== 页面（9 个） ==========
INSERT INTO [r_page] ([id],[name],[path],[module],[icon],[visible_to],[sort_order],[enabled]) VALUES
('pg-001','Dashboard','/dashboard','Overview','LayoutDashboard',N'["super_admin","platform_admin","security_admin","system_owner","system_engineer","system_auditor","system_viewer"]',1,1),
('pg-002','Systems','/systems','Lifecycle','Server',N'["super_admin","platform_admin","system_owner","system_engineer","system_auditor"]',2,1),
('pg-003','Data Sync','/data-sync','Data','RefreshCw',N'["super_admin","platform_admin","system_owner","system_engineer"]',3,1),
('pg-004','Schema Browser','/schemas','Data','Database',N'["super_admin","platform_admin","system_owner","system_engineer","system_auditor"]',4,1),
('pg-005','Users','/users','Access','Users',N'["super_admin","platform_admin","security_admin"]',5,1),
('pg-006','Roles','/roles','Access','ShieldCheck',N'["super_admin","security_admin"]',6,1),
('pg-007','Permissions','/permissions','Access','Key',N'["super_admin","security_admin"]',7,1),
('pg-008','Page Management','/pages','Access','FileText',N'["super_admin","security_admin"]',8,1),
('pg-009','Settings','/settings','System','Settings',N'["super_admin","platform_admin"]',9,1);


-- ========== 退役系统（6 个） ==========
INSERT INTO [r_system]
([id],[name],[code],[description],[owner],[department],[stage],[status],[created_at],[archived_at],[db_config],[storage_config],[last_sync],[sync_status],[schema_count],[table_count],[data_size_gb],[tags]) VALUES
('sys-001','Customer Order Platform','COP','B2C e-commerce order management and fulfillment system','Sarah Chen','Commerce','active','ARCHIVED','2023-03-15',NULL,
 N'{"engine":"postgresql","host":"prod-cop-db.internal","port":5432,"database":"cop_main","username":"cop_app","ssl":true}',
 N'{"provider":"aws-s3","bucket":"cop-prod-media","region":"us-east-1","accessKey":"AKIA****4F2X"}',
 '2026-08-06 02:14','success',8,142,320,N'["commerce","critical","high-traffic"]'),
('sys-002','Legacy HR Portal','HRP','Legacy human resources self-service portal, decommissioned Q1 2026','Marcus Wong','Human Resources','deprecated','EXPIRING','2019-07-22',NULL,
 N'{"engine":"oracle","host":"legacy-hr-db.internal","port":1521,"database":"HRPROD","username":"hr_readonly","ssl":false}',
 N'{"provider":"azure-blob","bucket":"hr-portal-assets","region":"eastus","accessKey":"AZ****KQ9"}',
 '2026-07-28 18:40','partial',4,56,48,N'["legacy","hr","pii"]'),
('sys-003','Finance Reporting Engine','FRE','Monthly financial reporting and regulatory compliance data warehouse','Priya Patel','Finance','active','SYNCING','2022-11-08',NULL,
 N'{"engine":"sqlserver","host":"fin-dw.internal","port":1433,"database":"FIN_DW","username":"fin_etl","ssl":true}',
 N'{"provider":"gcs","bucket":"fin-reports-archive","region":"us-central1","accessKey":"GO****M3B"}',
 '2026-08-06 01:00','syncing',12,238,890,N'["finance","compliance","warehouse"]'),
('sys-004','Mobile Push Gateway','MPG','Push notification delivery service, sunset and data retained for audit','James Liu','Platform','archived','ARCHIVED','2021-05-30','2026-02-14',
 NULL,NULL,
 '2026-02-13 23:59','success',3,22,12,N'["archived","audit","push"]'),
('sys-005','Inventory Tracking System','ITS','Real-time warehouse inventory tracking across 14 distribution centers','Diana Ruiz','Logistics','active','SYNCING','2023-09-01',NULL,
 N'{"engine":"mysql","host":"inv-trk-db.internal","port":3306,"database":"inventory","username":"inv_svc","ssl":true}',
 N'{"provider":"aws-s3","bucket":"its-snapshots","region":"us-west-2","accessKey":"AKIA****9PQ"}',
 '2026-08-05 22:30','failed',6,84,156,N'["logistics","realtime"]'),
('sys-006','Marketing Campaign Manager','MCM','Campaign orchestration and A/B testing platform','Tom Anderson','Marketing','active','REGISTERED','2024-01-20',NULL,
 N'{"engine":"mongodb","host":"mcm-mongo.internal","port":27017,"database":"campaigns","username":"mcm_user","ssl":true}',
 N'{"provider":"minio","bucket":"mcm-assets","region":"local","endpoint":"https://minio.internal","accessKey":"MIN****7X2"}',
 '2026-08-06 03:15','idle',5,38,64,N'["marketing","experiments"]');


-- ========== 同步任务（6 个） ==========
INSERT INTO [r_sync_job] ([id],[system_id],[system_name],[type],[status],[started_at],[duration],[records],[triggered_by]) VALUES
('job-001','sys-001','Customer Order Platform','incremental','success','2026-08-06 02:14','4m 32s',128400,'Scheduled'),
('job-002','sys-003','Finance Reporting Engine','full','syncing','2026-08-06 01:00','—',0,'Priya Patel'),
('job-003','sys-005','Inventory Tracking System','incremental','failed','2026-08-05 22:30','1m 15s',0,'Scheduled'),
('job-004','sys-002','Legacy HR Portal','schema-only','partial','2026-07-28 18:40','12m 08s',8420,'Marcus Wong'),
('job-005','sys-006','Marketing Campaign Manager','full','success','2026-08-06 03:15','8m 44s',56200,'Scheduled'),
('job-006','sys-004','Mobile Push Gateway','full','success','2026-02-13 23:59','22m 10s',1200000,'Decommission');


-- ========== Schema（3 个） ==========
INSERT INTO [r_schema] ([id],[system_id],[name],[tables],[synced_at]) VALUES
('sc-001','sys-001','orders',N'[{"id":"t-001","name":"order_header","columns":24,"rows":4820000,"sizeMB":1240,"archived":true},{"id":"t-002","name":"order_items","columns":18,"rows":18500000,"sizeMB":4200,"archived":true},{"id":"t-003","name":"order_status_log","columns":8,"rows":920000,"sizeMB":180,"archived":true},{"id":"t-004","name":"payment_transactions","columns":16,"rows":4820000,"sizeMB":890,"archived":true}]','2026-08-06 02:14'),
('sc-002','sys-001','customers',N'[{"id":"t-005","name":"customer_profile","columns":32,"rows":2100000,"sizeMB":680,"archived":true},{"id":"t-006","name":"customer_address","columns":12,"rows":5400000,"sizeMB":320,"archived":true},{"id":"t-007","name":"loyalty_points","columns":10,"rows":2100000,"sizeMB":150,"archived":true}]','2026-08-06 02:14'),
('sc-003','sys-003','finance_fact',N'[{"id":"t-008","name":"fact_revenue","columns":28,"rows":42000000,"sizeMB":8900,"archived":true},{"id":"t-009","name":"fact_expense","columns":24,"rows":38000000,"sizeMB":7600,"archived":true},{"id":"t-010","name":"fact_budget","columns":20,"rows":1200000,"sizeMB":240,"archived":true}]','2026-08-06 01:00');


-- ========== 物理表元数据（3 张，用于配置化前端渲染） ==========
INSERT INTO [r_physical_table] ([id],[name],[label],[system_id],[columns],[rows]) VALUES
('pt-orders','orders',N'订单表','sys-001',
 N'[{"name":"order_id","type":"string","label":"订单编号"},{"name":"customer_id","type":"string","label":"客户编号"},{"name":"product_id","type":"string","label":"产品编号"},{"name":"order_date","type":"date","label":"下单日期"},{"name":"quantity","type":"number","label":"数量"},{"name":"amount","type":"number","label":"金额"},{"name":"status","type":"select","label":"状态"},{"name":"is_paid","type":"boolean","label":"已付款"}]',
 N'[{"order_id":"ORD-2026-0001","customer_id":"C001","product_id":"P100","order_date":"2026-07-01","quantity":2,"amount":598.0,"status":"completed","is_paid":true},{"order_id":"ORD-2026-0002","customer_id":"C002","product_id":"P200","order_date":"2026-07-03","quantity":1,"amount":1299.0,"status":"shipped","is_paid":true},{"order_id":"ORD-2026-0003","customer_id":"C001","product_id":"P300","order_date":"2026-07-05","quantity":5,"amount":250.0,"status":"pending","is_paid":false},{"order_id":"ORD-2026-0004","customer_id":"C003","product_id":"P100","order_date":"2026-07-08","quantity":3,"amount":897.0,"status":"completed","is_paid":true},{"order_id":"ORD-2026-0005","customer_id":"C004","product_id":"P200","order_date":"2026-07-10","quantity":2,"amount":2598.0,"status":"cancelled","is_paid":false},{"order_id":"ORD-2026-0006","customer_id":"C002","product_id":"P400","order_date":"2026-07-12","quantity":10,"amount":990.0,"status":"shipped","is_paid":true},{"order_id":"ORD-2026-0007","customer_id":"C005","product_id":"P300","order_date":"2026-07-15","quantity":1,"amount":50.0,"status":"pending","is_paid":false},{"order_id":"ORD-2026-0008","customer_id":"C003","product_id":"P100","order_date":"2026-07-18","quantity":4,"amount":1196.0,"status":"completed","is_paid":true},{"order_id":"ORD-2026-0009","customer_id":"C001","product_id":"P200","order_date":"2026-07-20","quantity":2,"amount":2598.0,"status":"shipped","is_paid":true},{"order_id":"ORD-2026-0010","customer_id":"C004","product_id":"P400","order_date":"2026-07-22","quantity":8,"amount":792.0,"status":"completed","is_paid":true},{"order_id":"ORD-2026-0011","customer_id":"C005","product_id":"P100","order_date":"2026-07-25","quantity":1,"amount":299.0,"status":"pending","is_paid":false},{"order_id":"ORO-2026-0012","customer_id":"C002","product_id":"P300","order_date":"2026-07-28","quantity":6,"amount":300.0,"status":"cancelled","is_paid":false}]'),
('pt-customers','customers',N'客户表','sys-001',
 N'[{"name":"customer_id","type":"string","label":"客户编号"},{"name":"name","type":"string","label":"客户名称"},{"name":"email","type":"string","label":"邮箱"},{"name":"region","type":"select","label":"地区"},{"name":"level","type":"select","label":"客户等级"},{"name":"created_at","type":"date","label":"注册时间"}]',
 N'[{"customer_id":"C001","name":"张伟","email":"zhangwei@example.com","region":"华东","level":"VIP","created_at":"2023-01-15"},{"customer_id":"C002","name":"李娜","email":"lina@example.com","region":"华北","level":"普通","created_at":"2023-03-22"},{"customer_id":"C003","name":"王芳","email":"wangfang@example.com","region":"华南","level":"VIP","created_at":"2023-05-08"},{"customer_id":"C004","name":"刘洋","email":"liuyang@example.com","region":"华东","level":"普通","created_at":"2023-07-30"},{"customer_id":"C005","name":"陈静","email":"chenjing@example.com","region":"西南","level":"普通","created_at":"2023-09-14"}]'),
('pt-products','products',N'产品表','sys-001',
 N'[{"name":"product_id","type":"string","label":"产品编号"},{"name":"product_name","type":"string","label":"产品名称"},{"name":"category","type":"select","label":"分类"},{"name":"unit_price","type":"number","label":"单价"},{"name":"stock","type":"number","label":"库存"}]',
 N'[{"product_id":"P100","product_name":"无线蓝牙耳机","category":"电子产品","unit_price":299,"stock":150},{"product_id":"P200","product_name":"智能手表","category":"电子产品","unit_price":1299,"stock":80},{"product_id":"P300","product_name":"保温杯","category":"日用品","unit_price":50,"stock":500},{"product_id":"P400","product_name":"便携充电宝","category":"电子产品","unit_price":99,"stock":320}]');


-- ========== 查询配置（3 个） ==========
INSERT INTO [r_query_config] ([id],[name],[description],[base_table],[joins],[fields],[default_sort],[page_size],[status],[created_by],[created_at],[updated_at]) VALUES
('qc-001',N'订单综合查询',N'关联订单、客户、产品三张表，展示完整订单信息','orders',
 N'[{"id":"j1","leftTable":"orders","leftColumn":"customer_id","rightTable":"customers","rightColumn":"customer_id","joinType":"left"},{"id":"j2","leftTable":"orders","leftColumn":"product_id","rightTable":"products","rightColumn":"product_id","joinType":"left"}]',
 N'[{"id":"f1","alias":"order_id","table":"orders","column":"order_id","label":"订单编号","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f2","alias":"order_date","table":"orders","column":"order_date","label":"下单日期","sortable":true,"filterable":true,"visible":true,"render":"date"},{"id":"f3","alias":"customer_name","table":"customers","column":"name","label":"客户名称","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f4","alias":"region","table":"customers","column":"region","label":"地区","sortable":false,"filterable":true,"visible":true,"render":"tag","options":["华东","华北","华南","西南"]},{"id":"f5","alias":"level","table":"customers","column":"level","label":"客户等级","sortable":false,"filterable":true,"visible":true,"render":"badge","options":["VIP","普通"]},{"id":"f6","alias":"product_name","table":"products","column":"product_name","label":"产品名称","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f7","alias":"category","table":"products","column":"category","label":"分类","sortable":false,"filterable":true,"visible":true,"render":"tag","options":["电子产品","日用品"]},{"id":"f8","alias":"quantity","table":"orders","column":"quantity","label":"数量","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f9","alias":"amount","table":"orders","column":"amount","label":"金额","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f10","alias":"status","table":"orders","column":"status","label":"状态","sortable":true,"filterable":true,"visible":true,"render":"badge","options":["completed","shipped","pending","cancelled"]},{"id":"f11","alias":"is_paid","table":"orders","column":"is_paid","label":"已付款","sortable":false,"filterable":true,"visible":true,"render":"badge"}]',
 N'{"field":"order_date","direction":"desc"}',10,'active','Sarah Chen','2026-06-01 00:00:00','2026-07-15 00:00:00'),
('qc-002',N'客户订单统计',N'按客户汇总订单数量和总金额','customers',
 N'[{"id":"j1","leftTable":"customers","leftColumn":"customer_id","rightTable":"orders","rightColumn":"customer_id","joinType":"left"}]',
 N'[{"id":"f1","alias":"customer_id","table":"customers","column":"customer_id","label":"客户编号","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f2","alias":"name","table":"customers","column":"name","label":"客户名称","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f3","alias":"region","table":"customers","column":"region","label":"地区","sortable":false,"filterable":true,"visible":true,"render":"tag","options":["华东","华北","华南","西南"]},{"id":"f4","alias":"level","table":"customers","column":"level","label":"客户等级","sortable":false,"filterable":true,"visible":true,"render":"badge","options":["VIP","普通"]},{"id":"f5","alias":"email","table":"customers","column":"email","label":"邮箱","sortable":false,"filterable":false,"visible":true,"render":"text"},{"id":"f6","alias":"order_id","table":"orders","column":"order_id","label":"订单编号","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f7","alias":"amount","table":"orders","column":"amount","label":"订单金额","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f8","alias":"status","table":"orders","column":"status","label":"订单状态","sortable":false,"filterable":true,"visible":true,"render":"badge","options":["completed","shipped","pending","cancelled"]}]',
 N'{"field":"name","direction":"asc"}',10,'active','Robert Kim','2026-06-10 00:00:00','2026-07-20 00:00:00'),
('qc-003',N'产品销售明细',N'按产品维度查看销售明细及库存','products',
 N'[{"id":"j1","leftTable":"products","leftColumn":"product_id","rightTable":"orders","rightColumn":"product_id","joinType":"left"}]',
 N'[{"id":"f1","alias":"product_id","table":"products","column":"product_id","label":"产品编号","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f2","alias":"product_name","table":"products","column":"product_name","label":"产品名称","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f3","alias":"category","table":"products","column":"category","label":"分类","sortable":false,"filterable":true,"visible":true,"render":"tag","options":["电子产品","日用品"]},{"id":"f4","alias":"unit_price","table":"products","column":"unit_price","label":"单价","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f5","alias":"stock","table":"products","column":"stock","label":"库存","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f6","alias":"order_id","table":"orders","column":"order_id","label":"订单编号","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f7","alias":"quantity","table":"orders","column":"quantity","label":"销售数量","sortable":true,"filterable":true,"visible":true,"render":"text"},{"id":"f8","alias":"amount","table":"orders","column":"amount","label":"销售金额","sortable":true,"filterable":true,"visible":true,"render":"text"}]',
 N'{"field":"product_name","direction":"asc"}',10,'draft','Priya Patel','2026-07-01 00:00:00','2026-07-25 00:00:00');

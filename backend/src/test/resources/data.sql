-- H2 测试种子数据（对齐 V4__seed_r_data.sql，密码 demo1234）

-- 用户（8 个）
INSERT INTO `r_user` (`id`,`name`,`email`,`password`,`avatar`,`role_code`,`category`,`system_ids`,`status`,`last_login`) VALUES
('u-001','Sarah Chen','sarah.chen@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','SC','super_admin','admin','[]','active','2026-08-06 08:42'),
('u-002','Robert Kim','robert.kim@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','RK','platform_admin','admin','[]','active','2026-08-06 07:30'),
('u-003','Emily Davis','emily.davis@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','ED','security_admin','admin','[]','active','2026-08-05 17:00'),
('u-004','Marcus Wong','marcus.wong@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','MW','system_owner','tenant','["sys-002","sys-004"]','active','2026-08-05 16:20'),
('u-005','Priya Patel','priya.patel@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','PP','system_engineer','tenant','["sys-003","sys-005"]','active','2026-08-06 07:15'),
('u-006','James Liu','james.liu@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','JL','system_engineer','tenant','["sys-001","sys-006"]','active','2026-08-04 11:30'),
('u-007','Diana Ruiz','diana.ruiz@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','DR','system_auditor','tenant','["sys-001","sys-003","sys-005"]','active','2026-08-05 09:00'),
('u-008','Tom Anderson','tom.anderson@company.com','$2a$10$FMjtvbMpXl.UjEFkYqlo.eDcJvPpt3ScochWpAAYcjSkb/clYZYlW','TA','system_viewer','tenant','["sys-006"]','disabled','2026-07-15 14:22');

-- 角色（7 个）
INSERT INTO `r_role` (`id`,`role_key`,`name`,`description`,`user_count`,`permissions`,`category`,`color`,`is_builtin`) VALUES
('r-001','super_admin','Super Administrator','Full access',1,'["*"]','admin','primary',1),
('r-002','platform_admin','Platform Administrator','Manage all',1,'["systems.view","systems.create","data.view"]','admin','secondary',1),
('r-003','security_admin','Security Administrator','Manage roles',1,'["roles.view","users.view"]','admin','error',1),
('r-004','system_owner','System Owner (Tenant)','Full assigned',1,'["tenant.systems.view","tenant.data.view","tenant.data.sync"]','tenant','secondary',1),
('r-005','system_engineer','System Engineer (Tenant)','Configure sync',2,'["tenant.systems.view","tenant.data.view","tenant.data.sync"]','tenant','accent',1),
('r-006','system_auditor','System Auditor (Tenant)','Read-only',1,'["tenant.systems.view","tenant.data.view"]','tenant','warning',1),
('r-007','system_viewer','System Viewer (Tenant)','View only',1,'["tenant.systems.view"]','tenant','neutral',1);

-- 权限
INSERT INTO `r_permission` (`id`,`code`,`name`,`module`,`action`,`category`,`description`) VALUES
('p-001','systems.view','View Systems','systems','view','admin','View systems'),
('p-002','systems.create','Create System','systems','create','admin','Create'),
('p-013','data.view','View Data','data','view','admin','View data'),
('p-021','tenant.systems.view','View Assigned','systems','view','tenant','Tenant view');

-- 页面
INSERT INTO `r_page` (`id`,`name`,`path`,`module`,`icon`,`visible_to`,`sort_order`,`enabled`) VALUES
('pg-001','Dashboard','/dashboard','Overview','LayoutDashboard','["super_admin","platform_admin"]',1,1),
('pg-002','Systems','/systems','Lifecycle','Server','["super_admin","platform_admin"]',2,1);

-- 退役系统（6 个）
INSERT INTO `r_system`
(`id`,`name`,`code`,`description`,`owner`,`department`,`stage`,`status`,`created_at`,`archived_at`,`db_config`,`storage_config`,`last_sync`,`sync_status`,`schema_count`,`table_count`,`data_size_gb`,`tags`) VALUES
('sys-001','Customer Order Platform','COP','B2C e-commerce','Sarah Chen','Commerce','active','ARCHIVED','2023-03-15',NULL,'{"engine":"postgresql","host":"prod-cop-db.internal","port":5432,"database":"cop_main","username":"cop_app","ssl":true}','{"provider":"aws-s3","bucket":"cop-prod-media","region":"us-east-1","accessKey":"AKIA****"}','2026-08-06 02:14','success',8,142,320,'["commerce","critical"]'),
('sys-002','Legacy HR Portal','HRP','Legacy HR','Marcus Wong','Human Resources','deprecated','EXPIRING','2019-07-22',NULL,'{"engine":"oracle","host":"legacy-hr-db.internal","port":1521,"database":"HRPROD","username":"hr_readonly","ssl":false}','{"provider":"azure-blob","bucket":"hr-portal-assets","region":"eastus","accessKey":"AZ****"}','2026-07-28 18:40','partial',4,56,48,'["legacy","hr"]'),
('sys-003','Finance Reporting Engine','FRE','Finance DW','Priya Patel','Finance','active','SYNCING','2022-11-08',NULL,'{"engine":"sqlserver","host":"fin-dw.internal","port":1433,"database":"FIN_DW","username":"fin_etl","ssl":true}','{"provider":"gcs","bucket":"fin-reports-archive","region":"us-central1","accessKey":"GO****"}','2026-08-06 01:00','syncing',12,238,890,'["finance","compliance"]'),
('sys-004','Mobile Push Gateway','MPG','Push notification','James Liu','Platform','archived','ARCHIVED','2021-05-30','2026-02-14',NULL,NULL,'2026-02-13 23:59','success',3,22,12,'["archived","audit"]'),
('sys-005','Inventory Tracking System','ITS','Warehouse tracking','Diana Ruiz','Logistics','active','SYNCING','2023-09-01',NULL,'{"engine":"mysql","host":"inv-trk-db.internal","port":3306,"database":"inventory","username":"inv_svc","ssl":true}','{"provider":"aws-s3","bucket":"its-snapshots","region":"us-west-2","accessKey":"AKIA****"}','2026-08-05 22:30','failed',6,84,156,'["logistics","realtime"]'),
('sys-006','Marketing Campaign Manager','MCM','Campaign orchestration','Tom Anderson','Marketing','active','REGISTERED','2024-01-20',NULL,'{"engine":"mongodb","host":"mcm-mongo.internal","port":27017,"database":"campaigns","username":"mcm_user","ssl":true}','{"provider":"minio","bucket":"mcm-assets","region":"local","accessKey":"MIN****"}','2026-08-06 03:15','idle',5,38,64,'["marketing","experiments"]');

-- 同步任务
INSERT INTO `r_sync_job` (`id`,`system_id`,`system_name`,`type`,`status`,`started_at`,`duration`,`records`,`triggered_by`) VALUES
('job-001','sys-001','Customer Order Platform','incremental','success','2026-08-06 02:14','4m 32s',128400,'Scheduled'),
('job-002','sys-003','Finance Reporting Engine','full','syncing','2026-08-06 01:00','—',0,'Priya Patel');

-- Schema
INSERT INTO `r_schema` (`id`,`system_id`,`name`,`tables`,`synced_at`) VALUES
('sc-001','sys-001','orders','[{"id":"t-001","name":"order_header","columns":24,"rows":4820000,"sizeMB":1240,"archived":true}]','2026-08-06 02:14');

-- 物理表元数据
INSERT INTO `r_physical_table` (`id`,`name`,`label`,`system_id`,`columns`,`rows`) VALUES
('pt-orders','orders','订单表','sys-001','[{"name":"order_id","type":"string","label":"订单编号"},{"name":"customer_id","type":"string","label":"客户编号"},{"name":"amount","type":"number","label":"金额"},{"name":"status","type":"select","label":"状态"}]',
'[{"order_id":"ORD-2026-0001","customer_id":"C001","amount":598,"status":"completed"},{"order_id":"ORD-2026-0002","customer_id":"C002","amount":1299,"status":"shipped"}]'),
('pt-customers','customers','客户表','sys-001','[{"name":"customer_id","type":"string","label":"客户编号"},{"name":"name","type":"string","label":"客户名称"}]',
'[{"customer_id":"C001","name":"张伟","region":"华东"},{"customer_id":"C002","name":"李娜","region":"华北"}]'),
('pt-products','products','产品表','sys-001','[{"name":"product_id","type":"string","label":"产品编号"}]',
'[{"product_id":"P100","product_name":"耳机"}]');

-- 查询配置（2 个，对齐测试断言）
INSERT INTO `r_query_config` (`id`,`name`,`description`,`base_table`,`joins`,`fields`,`default_sort`,`page_size`,`status`,`created_by`,`created_at`,`updated_at`) VALUES
('qc-001','订单综合查询','关联订单客户产品','orders','[{"id":"j1","leftTable":"orders","leftColumn":"customer_id","rightTable":"customers","rightColumn":"customer_id","joinType":"left"}]','[{"alias":"order_id","table":"orders","column":"order_id","label":"订单编号"}]','{"field":"order_id","direction":"desc"}',10,'active','Sarah Chen','2026-06-01 00:00:00','2026-07-15 00:00:00'),
('qc-002','客户订单统计','按客户汇总','customers','[]','[{"alias":"name","table":"customers","column":"name","label":"客户名称"}]','{"field":"name","direction":"asc"}',10,'active','Robert Kim','2026-06-10 00:00:00','2026-07-20 00:00:00');

-- 仪表盘同步活跃度
INSERT INTO `r_sync_activity` (`id`,`day_label`,`activity_date`,`success_count`,`failed_count`,`partial_count`,`running_count`) VALUES
('sa-001','Mon','2026-07-31',4,1,0,0),
('sa-002','Tue','2026-08-01',5,0,1,0),
('sa-003','Wed','2026-08-02',3,2,0,0),
('sa-004','Thu','2026-08-03',6,0,0,0),
('sa-005','Fri','2026-08-04',4,1,1,0),
('sa-006','Sat','2026-08-05',2,0,0,1),
('sa-007','Sun','2026-08-06',3,0,0,2);

-- ================================================================
-- RIMS Decommission - 补充表种子数据（与 V4 的 r_system/r_sync_job 对齐）
-- 关联系统：sys-001..006（见 r_system）
-- 关联任务：job-001..006（见 r_sync_job）
-- ================================================================

-- ========== 源数据库（SourceDatabase）==========
INSERT INTO `r_source_database` (`id`,`source_system_id`,`db_type`,`server`,`database_name`,`connection_secret_ref`,`conn_string_hash`,`description`) VALUES
('sd-001','sys-001','POSTGRESQL','prod-cop-db.internal','cop_main','kv://cop-db-conn','h-9f2e41a0','Customer Order Platform 主库'),
('sd-002','sys-002','ORACLE','legacy-hr-db.internal','HRPROD','kv://hr-db-conn','h-c12b73fe','Legacy HR 生产库'),
('sd-003','sys-003','SQLSERVER','fin-dw.internal','FIN_DW','kv://fin-db-conn','h-5d81bc92','财务报表数仓'),
('sd-004','sys-005','MYSQL','inv-trk-db.internal','inventory','kv://inv-db-conn','h-0a3f67cd','库存跟踪库'),
('sd-005','sys-006','MONGODB','mcm-mongo.internal','campaigns','kv://mcm-db-conn','h-e8b4051d','营销活动库');

-- ========== 非结构化数据源（UnstructuredSource）==========
INSERT INTO `r_unstructured_source` (`id`,`source_system_id`,`source_type`,`location_uri`,`mount_path`,`file_pattern`,`date_extraction_rule`,`description`) VALUES
('us-001','sys-001','AZURE_BLOB','https://src.blob.core.windows.net/cop-invoices','/mnt/cop/invoices','*.pdf','regex:INV-YYYYMMDD-*.pdf','订单发票附件'),
('us-002','sys-004','FILE_SHARE','//legacy/mobilepush/attachments','/mnt/mpg/attachments','*.png','lastModifiedDate','推送网关静态资源'),
('us-003','sys-006','MINIO','s3://mcm-assets/campaigns','/mnt/mcm/assets','*.json','lastModifiedDate','营销素材');

-- ========== 非结构化条目（UnstructuredItem）==========
INSERT INTO `r_unstructured_item` (`id`,`unstructured_source_id`,`original_path`,`original_name`,`size_bytes`,`content_type`,`last_modified`,`derived_date`,`hash`) VALUES
('ui-001','us-001','/cop/invoices/2026/06/','INV-20260630-0001.pdf',245760,'application/pdf','2026-06-30 10:15:00','2026-06-30','sha256:ab12…'),
('ui-002','us-001','/cop/invoices/2026/07/','INV-20260701-0012.pdf',312000,'application/pdf','2026-07-01 09:40:00','2026-07-01','sha256:cd34…'),
('ui-003','us-002','/attachments/banners/','banner_home.png',184320,'image/png','2026-02-01 08:00:00','2026-02-01','sha256:ef56…'),
('ui-004','us-003','/campaigns/q3/','campaign_q3_v1.json',10240,'application/json','2026-07-15 12:00:00','2026-07-15','sha256:789a…');

-- ========== 归档批次（ArchiveBatch）==========
INSERT INTO `r_archive_batch` (`id`,`archive_job_id`,`batch_year`,`started_at`,`finished_at`,`rows_out`,`bytes_out`,`result`,`log_url`,`correlation_id`) VALUES
('ab-001','job-001',2026,'2026-08-06 02:14:00','2026-08-06 02:18:32',128400,155020800,'SUCCESS','https://logs/run-001','corr-001'),
('ab-002','job-002',2026,'2026-08-06 01:00:00',NULL,0,0,'RUNNING','https://logs/run-002','corr-002'),
('ab-003','job-004',2026,'2026-07-28 18:40:00','2026-07-28 18:52:08',8420,10485760,'PARTIAL','https://logs/run-004','corr-004'),
('ab-004','job-006',2026,'2026-02-13 23:59:00','2026-02-14 00:21:10',1200000,147000000,'SUCCESS','https://logs/run-006','corr-006');

-- ========== 归档文件（ArchiveFile，结构化表产物）==========
-- ========== 归档集（ArchiveSet，非结构化产物）==========
INSERT INTO `r_archive_set` (`id`,`archive_batch_id`,`set_name`,`blob_dir_url`,`items_count`,`bytes_total`,`created_on`) VALUES
('aset-001','ab-001','cop-invoices-2026-06','https://lake.blob.core.windows.net/cop/invoices/2026/06',12,2950000,'2026-08-06 02:19:00'),
('aset-002','ab-004','mpg-attachments-all','https://lake.blob.core.windows.net/mpg/attachments',184,138000000,'2026-02-14 00:22:00');

-- ========== 归档集条目（ArchiveSetItem）==========
INSERT INTO `r_archive_set_item` (`id`,`archive_set_id`,`original_path`,`original_name`,`blob_url`,`size_bytes`,`checksum`,`content_type`,`copied_at`) VALUES
('asi-001','aset-001','/cop/invoices/2026/06/','INV-20260630-0001.pdf','https://lake.blob.core.windows.net/cop/invoices/2026/06/INV-20260630-0001.pdf',245760,'sha256:ab12…','application/pdf','2026-08-06 02:19:00'),
('asi-002','aset-001','/cop/invoices/2026/06/','INV-20260630-0002.pdf','https://lake.blob.core.windows.net/cop/invoices/2026/06/INV-20260630-0002.pdf',220160,'sha256:ac78…','application/pdf','2026-08-06 02:19:00'),
('asi-003','aset-002','/attachments/banners/','banner_home.png','https://lake.blob.core.windows.net/mpg/attachments/banner_home.png',184320,'sha256:ef56…','image/png','2026-02-14 00:22:00');

-- ========== 保留策略（RetentionPolicy）==========
INSERT INTO `r_retention_policy` (`id`,`code`,`name`,`description`,`period_days`,`start_trigger`,`created_on`) VALUES
('rp-001','RET_ARCHIVE_7Y','通用归档保留 7 年','退役系统归档数据默认保留 7 年',2557,'SYNC_COMPLETED','2026-01-01 00:00:00'),
('rp-002','RET_FINANCE_10Y','财务合规保留 10 年','财务数据按监管要求保留 10 年',3652,'SYNC_COMPLETED','2026-01-01 00:00:00'),
('rp-003','RET_HR_5Y','HR 数据保留 5 年','人力资源数据保留 5 年',1826,'SYNC_COMPLETED','2026-01-01 00:00:00');

-- ========== 保留指派（RetentionAssignment）==========
INSERT INTO `r_retention_assignment` (`id`,`policy_id`,`object_type`,`object_id`,`start_date`,`due_date`,`status`,`current_hold_start`,`current_hold_end`,`assigned_by`) VALUES
('ra-001','rp-001','SYSTEM','sys-001','2026-08-06','2033-08-06','ACTIVE',NULL,NULL,'u-001'),
('ra-002','rp-002','SYSTEM','sys-003','2026-08-06','2036-08-05','ACTIVE',NULL,NULL,'u-001'),
('ra-003','rp-003','SYSTEM','sys-002','2026-07-28','2031-07-27','ACTIVE','2026-07-30 09:00:00','2026-12-31 23:59:59','u-001'),
('ra-004','rp-001','TABLE','t-001','2026-08-06','2033-08-06','ACTIVE',NULL,NULL,'u-001');

-- ========== 法定保留事件（LegalHoldEvent）==========
INSERT INTO `r_legal_hold_event` (`id`,`assignment_id`,`action`,`hold_start`,`hold_end`,`reason`,`actor_id`,`ts`) VALUES
('lh-001','ra-003','HOLD','2026-07-30 09:00:00',NULL,'疑似劳动争议诉讼，冻结 HR 数据','u-003','2026-07-30 09:05:00'),
('lh-002','ra-004','HOLD','2026-08-01 10:00:00',NULL,'审计取证，冻结订单数据','u-003','2026-08-01 10:02:00');

-- ========== 标签（Tag）==========
INSERT INTO `r_tag` (`id`,`tag_key`,`tag_value`) VALUES
('tag-001','category','commerce'),
('tag-002','category','finance'),
('tag-003','category','hr'),
('tag-004','critical','true'),
('tag-005','pii','true'),
('tag-006','legal-hold','active');

-- ========== 对象标签（ObjectTag）==========
INSERT INTO `r_object_tag` (`id`,`object_type`,`object_id`,`tag_id`) VALUES
('ot-001','SYSTEM','sys-001','tag-001'),
('ot-002','SYSTEM','sys-001','tag-004'),
('ot-003','SYSTEM','sys-003','tag-002'),
('ot-004','SYSTEM','sys-002','tag-003'),
('ot-005','SYSTEM','sys-002','tag-005'),
('ot-006','TABLE','t-001','tag-006');

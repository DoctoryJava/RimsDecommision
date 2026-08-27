-- ================================================================
-- RIMS Decommission - 仪表盘聚合数据种子
-- Flyway Migration V8__seed_dashboard_data.sql（SQL Server 版）
-- ================================================================

INSERT INTO [r_sync_activity] ([id],[day_label],[activity_date],[success_count],[failed_count],[partial_count],[running_count]) VALUES
('sa-001','Mon','2026-07-31',4,1,0,0),
('sa-002','Tue','2026-08-01',5,0,1,0),
('sa-003','Wed','2026-08-02',3,2,0,0),
('sa-004','Thu','2026-08-03',6,0,0,0),
('sa-005','Fri','2026-08-04',4,1,1,0),
('sa-006','Sat','2026-08-05',2,0,0,1),
('sa-007','Sun','2026-08-06',3,0,0,2);

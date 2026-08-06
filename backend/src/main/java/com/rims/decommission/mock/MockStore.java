package com.rims.decommission.mock;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Mock data aligned with frontend src/data/mockData.ts and queryData.ts
 * Used for Phase 1-5 demo when DB not yet wired. All controllers return from here.
 */
public class MockStore {

    public static List<Map<String,Object>> systems() {
        return List.of(
            sys("sys-001","Customer Order Platform","COP","B2C e-commerce order management","Sarah Chen","Commerce","active","2023-03-15",null,8,142,320,List.of("commerce","critical"),"prod-cop-db.internal",5432,"cop_main","cop-prod-media","us-east-1","success"),
            sys("sys-002","Legacy HR Portal","HRP","Legacy HR self-service, decommissioned Q1 2026","Marcus Wong","Human Resources","deprecated","2019-07-22",null,4,56,48,List.of("legacy","hr"),"legacy-hr-db.internal",1521,"HRPROD","hr-portal-assets","eastus","partial"),
            sys("sys-003","Finance Reporting Engine","FRE","Monthly financial reporting DW","Priya Patel","Finance","active","2022-11-08",null,12,238,890,List.of("finance","compliance"),"fin-dw.internal",1433,"FIN_DW","fin-reports-archive","us-central1","syncing"),
            sys("sys-004","Mobile Push Gateway","MPG","Push notification, sunset","James Liu","Platform","archived","2021-05-30","2026-02-14",3,22,12,List.of("archived","audit"),null,null,null,null,null,"success"),
            sys("sys-005","Inventory Tracking System","ITS","Real-time warehouse tracking","Diana Ruiz","Logistics","active","2023-09-01",null,6,84,156,List.of("logistics","realtime"),"inv-trk-db.internal",3306,"inventory","its-snapshots","us-west-2","failed"),
            sys("sys-006","Marketing Campaign Manager","MCM","Campaign orchestration","Tom Anderson","Marketing","active","2024-01-20",null,5,38,64,List.of("marketing","experiments"),"mcm-mongo.internal",27017,"campaigns","mcm-assets","local","idle")
        );
    }
    private static Map<String,Object> sys(String id,String name,String code,String desc,String owner,String dept,String stage,String createdAt,String archivedAt,int schemaCount,int tableCount,int dataSizeGB,List<String> tags,String host,Integer port,String db,String bucket,String region,String syncStatus){
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",id); m.put("name",name); m.put("code",code); m.put("description",desc); m.put("owner",owner); m.put("department",dept); m.put("stage",stage); m.put("createdAt",createdAt); m.put("archivedAt",archivedAt);
        m.put("dbConfig", host==null?null:Map.of("engine",port==27017?"mongodb":port==1521?"oracle":port==1433?"sqlserver":port==3306?"mysql":"postgresql","host",host,"port",port,"database",db,"username",code.toLowerCase()+"_app","ssl",true));
        m.put("storageConfig", bucket==null?null:Map.of("provider",region.equals("local")?"minio":bucket.contains("hr")?"azure-blob":bucket.contains("fin")?"gcs":"aws-s3","bucket",bucket,"region",region,"accessKey","AKIA****"));
        m.put("lastSync","2026-08-06 02:14"); m.put("syncStatus",syncStatus); m.put("schemaCount",schemaCount); m.put("tableCount",tableCount); m.put("dataSizeGB",dataSizeGB); m.put("tags",tags);
        return m;
    }

    public static List<Map<String,Object>> users() {
        return List.of(
            user("u-001","Sarah Chen","sarah.chen@company.com","SC","super_admin","admin",List.of(),"active","2026-08-06 08:42"),
            user("u-002","Robert Kim","robert.kim@company.com","RK","platform_admin","admin",List.of(),"active","2026-08-06 07:30"),
            user("u-003","Emily Davis","emily.davis@company.com","ED","security_admin","admin",List.of(),"active","2026-08-05 17:00"),
            user("u-004","Marcus Wong","marcus.wong@company.com","MW","system_owner","tenant",List.of("sys-002","sys-004"),"active","2026-08-05 16:20"),
            user("u-005","Priya Patel","priya.patel@company.com","PP","system_engineer","tenant",List.of("sys-003","sys-005"),"active","2026-08-06 07:15"),
            user("u-006","James Liu","james.liu@company.com","JL","system_engineer","tenant",List.of("sys-001","sys-006"),"active","2026-08-04 11:30"),
            user("u-007","Diana Ruiz","diana.ruiz@company.com","DR","system_auditor","tenant",List.of("sys-001","sys-003","sys-005"),"active","2026-08-05 09:00"),
            user("u-008","Tom Anderson","tom.anderson@company.com","TA","system_viewer","tenant",List.of("sys-006"),"disabled","2026-07-15 14:22")
        );
    }
    private static Map<String,Object> user(String id,String name,String email,String avatar,String role,String cat,List<String> sids,String status,String lastLogin){
        return Map.of("id",id,"name",name,"email",email,"avatar",avatar,"role",role,"category",cat,"systemIds",sids,"status",status,"lastLogin",lastLogin,"createdAt","2023-01-10");
    }

    public static List<Map<String,Object>> roles() {
        return List.of(
            role("r-001","super_admin","Super Administrator","Full access",1,List.of("*"),"admin","primary",true),
            role("r-002","platform_admin","Platform Administrator","Manage all",1,List.of("systems.view","users.view","data.view"),"admin","secondary",true),
            role("r-003","security_admin","Security Administrator","Manage roles",1,List.of("roles.view"),"admin","error",true),
            role("r-004","system_owner","System Owner (Tenant)","Full assigned",1,List.of("tenant.systems.view","tenant.data.view"),"tenant","secondary",true),
            role("r-005","system_engineer","System Engineer (Tenant)","Configure sync",2,List.of("tenant.data.sync"),"tenant","accent",true),
            role("r-006","system_auditor","System Auditor (Tenant)","Read-only",1,List.of("tenant.data.view"),"tenant","warning",true),
            role("r-007","system_viewer","System Viewer (Tenant)","View only",1,List.of("tenant.systems.view"),"tenant","neutral",true)
        );
    }
    private static Map<String,Object> role(String id,String key,String name,String desc,int cnt,List<String> perms,String cat,String color,boolean builtin){
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",id); m.put("key",key); m.put("name",name); m.put("description",desc); m.put("userCount",cnt); m.put("permissions",perms); m.put("category",cat); m.put("color",color); m.put("isBuiltin",builtin);
        return m;
    }

    public static List<Map<String,Object>> permissions() {
        return List.of(
            perm("p-001","systems.view","View All Systems","systems","view","admin"),
            perm("p-002","systems.create","Create System","systems","create","admin"),
            perm("p-003","systems.edit","Edit System","systems","edit","admin"),
            perm("p-013","data.view","View All Data","data","view","admin"),
            perm("p-014","data.sync","Trigger Sync","data","sync","admin"),
            perm("p-021","tenant.systems.view","View Assigned Systems","systems","view","tenant"),
            perm("p-023","tenant.data.view","View System Data","data","view","tenant")
        );
    }
    private static Map<String,Object> perm(String id,String code,String name,String mod,String act,String cat){
        return Map.of("id",id,"code",code,"name",name,"description",name,"module",mod,"action",act,"category",cat);
    }

    public static List<Map<String,Object>> syncJobs() {
        return List.of(
            job("job-001","sys-001","Customer Order Platform","incremental","success","2026-08-06 02:14","4m 32s",128400,"Scheduled"),
            job("job-002","sys-003","Finance Reporting Engine","full","syncing","2026-08-06 01:00","—",0,"Priya Patel"),
            job("job-003","sys-005","Inventory Tracking System","incremental","failed","2026-08-05 22:30","1m 15s",0,"Scheduled"),
            job("job-004","sys-002","Legacy HR Portal","schema-only","partial","2026-07-28 18:40","12m 08s",8420,"Marcus Wong")
        );
    }
    private static Map<String,Object> job(String id,String sid,String sname,String type,String status,String started,String dur,int rec,String by){
        return Map.of("id",id,"systemId",sid,"systemName",sname,"type",type,"status",status,"startedAt",started,"duration",dur,"records",rec,"triggeredBy",by);
    }

    public static List<Map<String,Object>> schemas() {
        return List.of(
            Map.of("id","sc-001","systemId","sys-001","name","orders","tables",List.of(
                Map.of("id","t-001","name","order_header","columns",24,"rows",4820000,"sizeMB",1240,"archived",true),
                Map.of("id","t-002","name","order_items","columns",18,"rows",18500000,"sizeMB",4200,"archived",true)
            ),"syncedAt","2026-08-06 02:14"),
            Map.of("id","sc-002","systemId","sys-001","name","customers","tables",List.of(Map.of("id","t-005","name","customer_profile","columns",32,"rows",2100000,"sizeMB",680,"archived",true)),"syncedAt","2026-08-06 02:14")
        );
    }

    public static List<Map<String,Object>> physicalTables() {
        return List.of(
            Map.of("name","orders","label","订单表","columns",List.of(
                Map.of("name","order_id","type","string","label","订单编号"),
                Map.of("name","customer_id","type","string","label","客户编号"),
                Map.of("name","amount","type","number","label","金额"),
                Map.of("name","status","type","select","label","状态")
            ),"rows",List.of(
                Map.of("order_id","ORD-2026-0001","customer_id","C001","amount",598,"status","completed"),
                Map.of("order_id","ORD-2026-0002","customer_id","C002","amount",1299,"status","shipped")
            )),
            Map.of("name","customers","label","客户表","columns",List.of(Map.of("name","customer_id","type","string","label","客户编号"),Map.of("name","name","type","string","label","客户名称")),"rows",List.of(Map.of("customer_id","C001","name","张伟"),Map.of("customer_id","C002","name","李娜"))),
            Map.of("name","products","label","产品表","columns",List.of(Map.of("name","product_id","type","string","label","产品编号")),"rows",List.of(Map.of("product_id","P100","product_name","耳机")))
        );
    }

    public static List<Map<String,Object>> queryConfigs() {
        return List.of(
            Map.of("id","qc-001","name","订单综合查询","description","关联订单、客户、产品","baseTable","orders","joins",List.of(Map.of("id","j1","leftTable","orders","leftColumn","customer_id","rightTable","customers","rightColumn","customer_id","joinType","left")),"fields",List.of(Map.of("alias","order_id","table","orders","column","order_id","label","订单编号")), "defaultSort",Map.of("field","order_id","direction","desc"),"pageSize",10,"status","active","createdBy","Sarah Chen","createdAt","2026-06-01","updatedAt","2026-07-15"),
            Map.of("id","qc-002","name","客户订单统计","description","按客户汇总","baseTable","customers","joins",List.of(),"fields",List.of(Map.of("alias","name","table","customers","column","name","label","客户名称")), "defaultSort",Map.of("field","name","direction","asc"),"pageSize",10,"status","active","createdBy","Robert Kim","createdAt","2026-06-10","updatedAt","2026-07-20")
        );
    }

    public static List<Map<String,Object>> pages() {
        return List.of(
            Map.of("id","pg-001","name","Dashboard","path","/dashboard","module","Overview","icon","LayoutDashboard","visibleTo",List.of("super_admin"),"order",1,"enabled",true),
            Map.of("id","pg-002","name","Systems","path","/systems","module","Lifecycle","icon","Server","visibleTo",List.of("super_admin"),"order",2,"enabled",true)
        );
    }
}

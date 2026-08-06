package com.rims.decommission.mock;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class MockStoreTest {

    @Test
    void systems_shouldContainSixRecords() {
        var systems = MockStore.systems();
        assertThat(systems).hasSize(6);
        assertThat(systems).extracting(m -> m.get("code"))
                .contains("COP","HRP","FRE","MPG","ITS","MCM");
    }

    @Test
    void systems_shouldHaveRequiredFields() {
        var s = MockStore.systems().get(0);
        assertThat(s).containsKeys("id","name","code","stage","dbConfig","storageConfig","tags");
        assertThat(s.get("stage")).isIn("active","deprecated","archived");
    }

    @Test
    void users_shouldContainEightWithRoles() {
        var users = MockStore.users();
        assertThat(users).hasSize(8);
        assertThat(users).extracting(m -> m.get("role"))
                .contains("super_admin","platform_admin","security_admin","system_viewer");
    }

    @Test
    void roles_shouldContainSevenWithBuiltin() {
        var roles = MockStore.roles();
        assertThat(roles).hasSize(7);
        assertThat(roles).extracting(m -> m.get("key")).contains("super_admin","system_viewer");
    }

    @Test
    void syncJobs_shouldHaveFourStatuses() {
        var jobs = MockStore.syncJobs();
        assertThat(jobs).extracting(m -> m.get("status"))
                .contains("success","syncing","failed","partial");
    }

    @Test
    void schemas_shouldHaveTables() {
        var schemas = MockStore.schemas();
        assertThat(schemas).isNotEmpty();
        var first = schemas.get(0);
        assertThat(first.get("tables")).asList().isNotEmpty();
    }

    @Test
    void physicalTables_shouldContainOrdersCustomersProducts() {
        var tables = MockStore.physicalTables();
        assertThat(tables).extracting(m -> m.get("name"))
                .contains("orders","customers","products");
        var orders = tables.stream().filter(t -> "orders".equals(t.get("name"))).findFirst().orElseThrow();
        assertThat(orders.get("columns")).asList().hasSizeGreaterThanOrEqualTo(4);
        assertThat(orders.get("rows")).asList().hasSize(2);
    }

    @Test
    void queryConfigs_shouldContainTwo() {
        var configs = MockStore.queryConfigs();
        assertThat(configs).hasSize(2);
        assertThat(configs).extracting(m -> m.get("id")).contains("qc-001","qc-002");
    }

    @Test
    void permissions_shouldBeTenantAndAdmin() {
        var perms = MockStore.permissions();
        assertThat(perms).extracting(m -> m.get("category")).contains("admin","tenant");
    }
}

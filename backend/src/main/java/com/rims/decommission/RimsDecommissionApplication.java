package com.rims.decommission;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RimsDecommissionApplication {
    public static void main(String[] args) {
        SpringApplication.run(RimsDecommissionApplication.class, args);
    }
}

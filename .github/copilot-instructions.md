# GitHub Copilot Instructions

You are working on **RIMS Decommission**, an enterprise data archive lifecycle management platform.

## Tech Stack
- **Backend**: Java 17, Spring Boot 3.2, MyBatis-Plus 3.5, Spring Security + JWT
- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4, TypeScript (strict), Hooks
- **Database**: SQL Server 2019+ (metadata only), Redis 6
- **Big Data**: Databricks Java SDK (Jobs + SQL Statement Execution API)
- **Storage**: Azure ADLS Gen2 (Iceberg), Azure Blob Storage (attachments)
- **Governance**: Unity Catalog (table permissions + Column Mask)
- **Security**: Azure Key Vault, JWT, SAS tokens

## Critical Architecture Rules
1. **Metadata-Data Separation**: SQL Server stores ONLY config/metadata. All archive data queries go through Databricks SQL.
2. **No plaintext credentials**: Use Azure Key Vault or encrypted fields.
3. **Column masking via Unity Catalog**: Never implement masking in Java or TypeScript.
4. **SAS tokens for attachments**: Backend signs short-lived (≤15min) SAS URLs.
5. **1:1 data ingestion**: Source tables map 1:1 to Iceberg tables, no denormalization.

## Coding Conventions
- Backend: Controller → Service (interface+impl) → Mapper. Use `Result<T>` for responses.
- Frontend: `<script setup lang="ts">`, no `any`, API files per domain in `src/api/`.
- Database: Flyway migrations only, never ALTER existing tables manually.
- Primary keys: `Long` with snowflake ID (`IdType.ASSIGN_ID`).

## Key Domain Concepts
- **Archive System**: A decommissioned source system (e.g., CRM_V1)
- **Schema Registry**: JSON metadata describing table structure, driving dynamic UI rendering
- **Data Lifecycle**: Retention period after which data must be physically destroyed (DROP + VACUUM)

For full details, read `CLAUDE.md` (coding rules) and `AGENTS.md` (domain knowledge).

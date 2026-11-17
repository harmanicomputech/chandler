# Chandler Digital Ecosystem

**Visit Chandler** destination platform + **Chandler Economic Development** investment platform on one shared CMS — proposed solution by Techatron Consulting Limited for the City of Chandler, Arizona.

```bash
npm ci
cp .env.example .env.local                      # set DATABASE_URL at minimum
npm run db:migrate && npm run db:seed           # creates schema, migrates audited content, writes .seed-credentials
npm run dev                                     # http://localhost:3000  ·  EDO: /edo/  ·  CMS: /admin/
```

| | |
|---|---|
| Overview | [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) |
| Architecture & security | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Audit inventories | [Visit Chandler](docs/WEBSITE_INVENTORY.md) · [Economic Development](docs/ECONOMIC_DEVELOPMENT_INVENTORY.md) |
| Images | [IMAGE_MANIFEST.csv](docs/IMAGE_MANIFEST.csv) · [IMAGE_PERMISSIONS.csv](docs/IMAGE_PERMISSIONS.csv) |
| Design | [BRAND_TOKENS.json](docs/BRAND_TOKENS.json) · [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) · [Typography](docs/TYPOGRAPHY_SYSTEM.md) · [Spacing](docs/SPACING_SYSTEM.md) · [Components](docs/COMPONENT_LIBRARY.md) |
| Data | [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) |
| Integrations | [API_INTEGRATIONS.md](docs/API_INTEGRATIONS.md) |
| CMS | [CMS_DOCUMENTATION.md](docs/CMS_DOCUMENTATION.md) · [ADMIN_USER_GUIDE.md](docs/ADMIN_USER_GUIDE.md) |
| SEO | [SEO_MIGRATION_MAP.csv](docs/SEO_MIGRATION_MAP.csv) · [REDIRECT_MAP.csv](docs/REDIRECT_MAP.csv) |
| Quality | [TESTING_REPORT.md](docs/TESTING_REPORT.md) · [DEVELOPMENT_TRACKER.md](docs/DEVELOPMENT_TRACKER.md) |
| Operations | [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) |

Tests: `npm run build && npm start -- -p 3001` then `npm run test:e2e`.

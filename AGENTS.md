# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

XOANA is an e-commerce website for an independent fingerboard (finger skateboard) brand. Spring Boot 3.2 backend (Java 17) + Next.js frontend (TypeScript). This is a university course project with mock payments.

## Commands

### Frontend (`frontend/`)
```bash
pnpm dev          # Start Next.js dev server (port 3000)
pnpm build        # Production build
pnpm start        # Serve production build
pnpm lint         # ESLint
pnpm typecheck    # Generate route types and run TypeScript checks
```
**Use `pnpm`, not npm.** The `packageManager` field in `package.json` pins pnpm@10.23.0.

### Backend (`backend/`)
```bash
mvn spring-boot:run       # Start Spring Boot (port 8080)
mvn test                   # H2 integration and regression tests; no MySQL needed
```

### Full Stack
1. Start MySQL, create database `xoana`
2. `cd backend && mvn spring-boot:run`
3. `cd frontend && pnpm dev`
4. Frontend at http://localhost:3000, API at http://localhost:8080

## Architecture

### Backend (`com.xoana`)
- **Standard Spring Boot layered architecture**: Controller → Repository (no separate Service layer — controllers call repositories directly)
- **Security**: Stateless JWT auth via `JwtAuthFilter` (OncePerRequestFilter). HMAC-SHA256, 24h expiry; configure `APP_JWT_SECRET`, or a random key is generated per process. Each request checks the current database role and account status. See `backend/AUTHENTICATION.md`.
- **Public endpoints** (no auth): auth, public product/article reads, `GET /api/settings`, `/uploads/**`, and `POST /api/traffic/track`. Admin lists and all management writes require `ROLE_ADMIN`.
- **Auth endpoints**: user profiles, orders, and contact submission require an authenticated account; management endpoints require `ROLE_ADMIN`.
- **Roles**: `USER` and `ADMIN` — stored as enum on the `User` entity
- **Soft delete for products**: `ProductController.deleteProduct()` sets `deletedAt` and `active=false`. Admin and public product queries exclude deleted rows; inactive products without `deletedAt` remain editable in admin. Rows are retained for historical order references.
- **SiteSettings**: Singleton pattern — always id=1, initialized by `DataInitializer` if absent
- **File uploads**: Stored to `./uploads/` on disk, served via Spring static resource handler (`WebConfig`)

### Frontend (`frontend/src`)
- **Next.js 16 App Router** with TypeScript; consult the installed framework documentation before framework-specific changes
- **State management**: Zustand with `persist` middleware (localStorage key: `xoana-store`) — holds auth token, user info, and cart
- **Data fetching**: TanStack Query (React Query) + Axios
- **Styling**: Tailwind CSS v4 (CSS-based config via `@tailwindcss/postcss`, no `tailwind.config.js`)
- **i18n**: next-intl with locales `zh` (Chinese) and `en` (English). Locale persisted in a cookie, read in `src/i18n.ts`
- **Theming**: next-themes (light/dark, defaults to light)
- **Traffic tracking**: `LayoutShell` fires `POST /api/traffic/track` on every public page navigation
- **Admin layout**: Calls `GET /api/admin/session` and renders admin content only after server verification; local user metadata is for display only

### API Client (`frontend/src/lib/api.ts`)
Axios instance attaches JWT Bearer tokens from Zustand. A matching current token's 401 clears authentication and redirects to `/login`, preserving the cart; auth form errors and 403 are handled by the caller.

### Data Model (8 JPA entities)
- **User** → **Order** (1:N)
- **Order** → **OrderItem** (1:N)
- **OrderItem** → **Product** (N:1)
- **SiteTraffic**, **Article**, **SiteSettings**, **ContactMessage** are standalone
- Most entities have bilingual fields (`name`/`nameEn`, `description`/`descriptionEn`, `title`/`titleEn`, `content`/`contentEn`) for zh/en support

## Important Gotchas

### Default demonstration accounts (from `DataInitializer.java`)
| Username | Password | Role |
|----------|----------|------|
| `jacky` | `jacky060620` | ADMIN |
| `test` | `test123` | USER |

These accounts are for course demonstrations; preserve existing database accounts when editing startup code.

### Active profile is `prod`, not `dev`
`application.yml` sets `spring.profiles.active: prod`. Running the backend connects to MySQL at `localhost:3306/xoana` (user: `xoana`). Use `mvn spring-boot:run -Dspring-boot.run.profiles=dev` for H2 in-memory development. Tests use isolated H2 databases. Do not use production MySQL for tests.

### Next.js version
The frontend uses **Next.js 16** (React 19). The `frontend/AGENTS.md` file warns about breaking API changes — check `node_modules/next/dist/docs/` before writing framework-specific code.

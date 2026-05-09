# Casita - Agent Guide

This repository is a monorepo for the Casita expense tracker platform.

## Structure

- `apps/api`: Node.js API with Prisma and PostgreSQL.
- `apps/web`: Next.js web interface.
- `apps/mobile`: Expo React Native app.
- `packages/shared`: shared TypeScript types, constants and schemas.
- `packages/api-client`: shared HTTP client for web and mobile.
- `docs/expense-tracker-plan.md`: full technical planning document.

## Local Workflow

- Use npm workspaces from the repository root.
- Do not commit `.env` or `.env.production`.
- Keep shared contracts in `packages/shared` when they are used by more than one app.
- Keep API calls in `packages/api-client` when they are reused by web and mobile.

## Docker

- Development compose file: `docker-compose.dev.yml`.
- Production compose file: `docker-compose.prod.yml`.
- API runs on port `3000`.
- Web runs on port `3001` locally and proxies to port `3000` inside Docker.

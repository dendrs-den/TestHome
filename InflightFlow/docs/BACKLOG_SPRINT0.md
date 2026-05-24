# Backlog - Sprint 0

## P0
- Initialize monorepo package manager and workspace config
- Bootstrap `apps/web` with React + Vite + TypeScript
- Bootstrap `apps/api` with Fastify + TypeScript
- Add `packages/shared` with first `HealthResponse` contract
- Add docker compose with web/api/postgres
- Add CI pipeline for lint/test/build

## P1
- Add Prisma schema with initial entities
- Implement `/health` and `/version` endpoints
- Set up API validation and error middleware
- Add frontend API client and environment config

## P2
- Add test harness (unit + integration smoke)
- Add structured logger with request id correlation

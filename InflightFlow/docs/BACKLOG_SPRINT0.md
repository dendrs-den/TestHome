# Бэклог - Sprint 0

## P0
- Инициализировать monorepo package manager и workspace-конфиг
- Поднять `apps/web` на React + Vite + TypeScript
- Поднять `apps/api` на Fastify + TypeScript
- Добавить `packages/shared` с первым контрактом `HealthResponse`
- Добавить docker compose с web/api/postgres
- Добавить CI-пайплайн для lint/test/build

## P1
- Добавить Prisma schema с начальными сущностями
- Реализовать endpoint `/health` и `/version`
- Настроить API-валидацию и error-middleware
- Добавить frontend API-клиент и env-конфиг

## P2
- Добавить test harness (unit + integration smoke)
- Добавить структурированный логгер с корреляцией request id

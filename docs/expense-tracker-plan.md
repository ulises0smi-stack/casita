# Expense Tracker - Planificacion tecnica completa

Ultima revision: 2026-05-09
Estado: propuesta lista para desarrollo

## 1. Objetivo

Construir una plataforma para gestionar gastos domesticos en grupo, con app movil multiplataforma, interfaz web, backend desplegable mediante Docker, soporte de tickets/fotos, multiples monedas y funcionamiento offline-first en movil.

El sistema debe permitir que el cliente movil siga funcionando aunque:

- el telefono no tenga conexion;
- el servidor no este disponible temporalmente;
- la red sea inestable;
- una foto de ticket no pueda subirse en el momento.

Cuando la conexion vuelva, los cambios pendientes deben sincronizarse de forma segura y predecible.

## 2. Alcance MVP

### Incluido

- Registro, login y logout.
- Refresh token rotation.
- Maximo 5 sesiones activas.
- Hogares/grupos.
- Miembros y roles.
- Categorias personalizables.
- Gastos con moneda.
- Fotos de tickets y recibos.
- Presupuestos mensuales.
- Reportes basicos.
- Interfaz web para gestion desde escritorio.
- Web responsive para desktop, tablet y movil.
- Modo offline en movil.
- Cola local de cambios pendientes.
- Sincronizacion incremental.
- Despliegue backend con Docker.
- Despliegue web con Docker.
- PostgreSQL en Docker para desarrollo y despliegue simple.
- Storage S3-compatible para recibos.

### Fuera del MVP

- Split de gastos entre miembros.
- OCR automatico.
- Notificaciones push.
- Integracion bancaria.
- Realtime con WebSocket.
- Conversion automatica de divisas.
- Offline-first completo en web.
- Pagos entre usuarios.

## 3. Decisiones principales

| Area | Decision |
| --- | --- |
| Backend | Node.js + Express/Fastify + TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Movil | React Native + Expo + TypeScript |
| Web | Next.js + React + TypeScript |
| Monorepo | npm workspaces o pnpm workspaces |
| Estado cliente | Zustand |
| DB local movil | SQLite |
| Cache local web MVP | TanStack Query cache / localStorage no sensible |
| Offline web v1.1 | IndexedDB + service worker + cola sync |
| Sincronizacion | Cola local + endpoint `/sync` |
| Auth | JWT access token + refresh token rotado |
| Secretos en movil | SecureStore |
| Dinero | Decimal en backend, string decimal en API |
| Moneda por defecto | EUR |
| Recibos | Storage externo S3-compatible |
| Docker | API + Web + PostgreSQL + storage + reverse proxy |

## 4. Arquitectura general

```txt
┌─────────────────────────────────────────────────────────────┐
│                         MOVIL                               │
│ React Native + Expo + Zustand + SQLite                      │
│                                                             │
│ - UI nativa                                                 │
│ - DB local                                                  │
│ - Cola de cambios offline                                   │
│ - Cache de recibos pendientes                               │
│ - Sync engine                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS + JWT
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                          WEB                                │
│ Next.js + React + TypeScript                                │
│                                                             │
│ - Dashboard desktop                                         │
│ - CRUD de gastos, categorias y presupuestos                 │
│ - Reportes amplios                                          │
│ - Subida de recibos desde navegador                         │
│ - PWA/offline en v1.1                                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS + JWT
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                        BACKEND                              │
│ Node.js + TypeScript + Prisma                               │
│                                                             │
│ - API REST                                                  │
│ - Auth y sesiones                                           │
│ - Autorizacion por household                                │
│ - Sync incremental                                          │
│ - URLs firmadas para recibos                                │
└───────────────┬──────────────────────────┬──────────────────┘
                │                          │
                │ SQL                      │ S3 API
                │                          │
┌───────────────┴───────────────┐  ┌───────┴──────────────────┐
│ PostgreSQL                     │  │ S3/R2/MinIO/Supabase      │
│ Fuente de verdad               │  │ Fotos de tickets/recibos  │
└───────────────────────────────┘  └──────────────────────────┘
```

## 5. Docker y despliegue

### 5.1 Servicios recomendados

Para desarrollo local:

- `api`: backend Node.js.
- `web`: interfaz web Next.js.
- `postgres`: base de datos.
- `minio`: storage S3-compatible local.
- `mailpit` opcional para emails de invitacion.

Para produccion simple:

- `api`: backend Node.js.
- `web`: interfaz web Next.js servida por Node o export estatico si aplica.
- `postgres`: base de datos con volumen persistente.
- `minio` solo si se quiere self-hosted storage.
- `caddy` o `nginx`: TLS y reverse proxy.

Para produccion mas robusta:

- `api` en Docker.
- `web` en Docker o plataforma frontend dedicada.
- PostgreSQL gestionado.
- Cloudflare R2, AWS S3 o Supabase Storage para recibos.
- Backups automaticos fuera del servidor.

### 5.2 Estructura monorepo con Docker

```txt
casita/
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── prisma/
│   │   ├── src/
│   │   └── package.json
│   ├── mobile/
│   │   ├── src/
│   │   ├── app.json
│   │   └── package.json
│   └── web/
│       ├── Dockerfile
│       ├── src/
│       ├── next.config.js
│       └── package.json
├── packages/
│   ├── shared/
│   └── api-client/
├── docs/
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── package.json
```

### 5.3 Dockerfile backend

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

Notas:

- En produccion las migraciones no deberian ejecutarse implicitamente al arrancar si quieres control fino.
- Para despliegue pequeno se puede usar un comando separado: `npx prisma migrate deploy`.
- Nunca incluir `.env` dentro de la imagen.

### 5.4 docker-compose.dev.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: expense
      POSTGRES_PASSWORD: expense_dev_password
      POSTGRES_DB: expense_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U expense -d expense_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio_dev_password
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_started
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://expense:expense_dev_password@postgres:5432/expense_db
      JWT_ACCESS_SECRET: change_me_access_secret_min_32_chars
      JWT_REFRESH_SECRET: change_me_refresh_secret_min_32_chars
      STORAGE_DRIVER: s3
      S3_ENDPOINT: http://minio:9000
      S3_REGION: local
      S3_BUCKET: receipts
      S3_ACCESS_KEY_ID: minio
      S3_SECRET_ACCESS_KEY: minio_dev_password
      S3_FORCE_PATH_STYLE: "true"
    ports:
      - "3000:3000"

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000/api
    ports:
      - "3001:3000"

volumes:
  postgres_data:
  minio_data:
```

### 5.5 docker-compose.prod.yml

```yaml
services:
  api:
    image: casita-api:latest
    restart: unless-stopped
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"

  web:
    image: casita-web:latest
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: https://api.tudominio.com/api
    depends_on:
      - api
    ports:
      - "3001:3000"

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: expense
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: expense_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U expense -d expense_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - api

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

### 5.6 Caddyfile ejemplo

```txt
api.tudominio.com {
  reverse_proxy api:3000
}

app.tudominio.com {
  reverse_proxy web:3000
}
```

### 5.7 Variables de entorno backend

```bash
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://expense:password@postgres:5432/expense_db

JWT_ACCESS_SECRET=replace_with_very_long_secret
JWT_REFRESH_SECRET=replace_with_another_very_long_secret
JWT_ACCESS_EXPIRY_SECONDS=900
JWT_REFRESH_EXPIRY_SECONDS=604800

CORS_ORIGINS=https://app.tudominio.com,exp://localhost:19000

MAX_ACTIVE_SESSIONS=5

STORAGE_DRIVER=s3
S3_ENDPOINT=https://...
S3_REGION=auto
S3_BUCKET=expense-receipts
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=false

MAX_RECEIPT_SIZE_BYTES=10485760
ALLOWED_RECEIPT_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf
```

## 6. Modelo de datos recomendado

### 6.1 Principios

- PostgreSQL es la fuente de verdad.
- El movil tiene una replica parcial y una cola de mutaciones.
- Todos los modelos sincronizables tienen `updatedAt`, `deletedAt` y `version`.
- Los borrados son logicos para entidades que deben sincronizarse.
- Las operaciones de cliente son idempotentes mediante `clientMutationId`.
- Los importes usan `Decimal`, no `Float`.
- Las monedas usan codigos ISO 4217: `EUR`, `USD`, `GBP`.

### 6.2 Prisma base

```prisma
enum MemberRole {
  admin
  member
}

enum CategoryType {
  income
  expense
}

enum ReceiptStatus {
  pending
  uploaded
  failed
  deleted
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  firstName     String?
  lastName      String?
  avatar        String?

  memberships   Member[]
  sessions      Session[]
  expensesAdded Expense[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Session {
  id               String   @id @default(cuid())
  userId           String
  refreshTokenHash String   @unique
  deviceId         String?
  deviceName       String?
  ipAddress        String?
  userAgent        String?
  revokedAt        DateTime?
  lastActivityAt   DateTime @default(now())
  expiresAt        DateTime
  createdAt        DateTime @default(now())

  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model Household {
  id              String   @id @default(cuid())
  name            String
  description     String?
  inviteCode      String   @unique @default(cuid())
  defaultCurrency String   @default("EUR")

  createdBy       String

  members         Member[]
  categories      Category[]
  expenses        Expense[]
  budgets         Budget[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  version         Int      @default(1)

  @@index([createdBy])
  @@index([updatedAt])
}

model Member {
  id          String     @id @default(cuid())
  householdId String
  userId      String
  role        MemberRole @default(member)

  household   Household  @relation(fields: [householdId], references: [id], onDelete: Cascade)
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  joinedAt    DateTime   @default(now())
  deletedAt   DateTime?
  updatedAt   DateTime   @updatedAt
  version     Int        @default(1)

  @@unique([householdId, userId])
  @@index([householdId])
  @@index([userId])
  @@index([updatedAt])
}

model Category {
  id          String       @id @default(cuid())
  householdId String
  name        String
  icon        String
  color       String
  type        CategoryType @default(expense)
  order       Int          @default(0)

  household   Household    @relation(fields: [householdId], references: [id], onDelete: Cascade)
  expenses    Expense[]
  budgets     Budget[]

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?
  version     Int          @default(1)

  @@unique([householdId, name])
  @@index([householdId])
  @@index([updatedAt])
}

model Expense {
  id          String   @id @default(cuid())
  householdId String
  categoryId  String
  addedBy     String

  amount      Decimal  @db.Decimal(12, 2)
  currency    String   @default("EUR")
  description String?
  date        DateTime

  household   Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  category    Category  @relation(fields: [categoryId], references: [id])
  addedByUser User      @relation(fields: [addedBy], references: [id])
  receipts    Receipt[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  version     Int       @default(1)

  @@index([householdId, date])
  @@index([categoryId])
  @@index([addedBy])
  @@index([updatedAt])
}

model Receipt {
  id            String        @id @default(cuid())
  expenseId     String
  householdId   String

  storageKey    String
  mimeType      String
  sizeBytes     Int
  originalName  String?
  status        ReceiptStatus @default(pending)

  ocrStatus     String        @default("skipped")
  ocrText       String?

  expense       Expense       @relation(fields: [expenseId], references: [id], onDelete: Cascade)

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  deletedAt     DateTime?
  version       Int           @default(1)

  @@index([expenseId])
  @@index([householdId])
  @@index([updatedAt])
}

model Budget {
  id          String   @id @default(cuid())
  householdId String
  categoryId  String

  limitAmount Decimal  @db.Decimal(12, 2)
  currency    String   @default("EUR")
  month       Int
  year        Int

  household   Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  category    Category  @relation(fields: [categoryId], references: [id])

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  version     Int       @default(1)

  @@unique([householdId, categoryId, month, year, currency])
  @@index([householdId])
  @@index([updatedAt])
}

model ClientMutation {
  id               String   @id @default(cuid())
  userId           String
  householdId      String?
  clientMutationId String   @unique
  operation        String
  entity           String
  entityId         String?
  requestHash      String?
  responseJson     Json?
  createdAt        DateTime @default(now())

  @@index([userId])
  @@index([householdId])
}
```

## 7. API REST propuesta

### 7.1 Auth

```txt
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/auth/sessions
DELETE /api/auth/sessions/:sessionId
```

Reglas:

- `refreshToken` se guarda hasheado en DB.
- `accessToken` dura 15 minutos.
- `refreshToken` dura 7 dias o 30 dias si se activa "recordarme".
- Maximo 5 sesiones activas.
- Si el usuario inicia una sexta sesion, revocar la mas antigua o rechazar con `409 TOO_MANY_SESSIONS`.

Recomendacion: revocar la mas antigua para una experiencia mas fluida.

### 7.2 Households

```txt
POST   /api/households
GET    /api/households
GET    /api/households/:householdId
PUT    /api/households/:householdId
DELETE /api/households/:householdId

POST   /api/households/:householdId/invites
POST   /api/households/join
GET    /api/households/:householdId/members
DELETE /api/households/:householdId/members/:memberId
```

### 7.3 Gastos

```txt
GET    /api/households/:householdId/expenses
POST   /api/households/:householdId/expenses
GET    /api/households/:householdId/expenses/:expenseId
PUT    /api/households/:householdId/expenses/:expenseId
DELETE /api/households/:householdId/expenses/:expenseId
```

### 7.4 Recibos

```txt
POST   /api/households/:householdId/expenses/:expenseId/receipts
GET    /api/households/:householdId/expenses/:expenseId/receipts
GET    /api/households/:householdId/receipts/:receiptId/download-url
DELETE /api/households/:householdId/receipts/:receiptId
```

El endpoint de subida puede usar:

- `multipart/form-data`, mas simple para MVP;
- subida directa con URL firmada, mejor para produccion y archivos grandes.

Para MVP, `multipart/form-data` es suficiente.

### 7.5 Categorias

```txt
GET    /api/households/:householdId/categories
POST   /api/households/:householdId/categories
PUT    /api/households/:householdId/categories/:categoryId
DELETE /api/households/:householdId/categories/:categoryId
```

El borrado debe ser logico si la categoria tiene gastos.

### 7.6 Presupuestos

```txt
GET    /api/households/:householdId/budgets
POST   /api/households/:householdId/budgets
PUT    /api/households/:householdId/budgets/:budgetId
DELETE /api/households/:householdId/budgets/:budgetId
```

### 7.7 Reportes

```txt
GET /api/households/:householdId/reports/summary
GET /api/households/:householdId/reports/monthly
GET /api/households/:householdId/reports/member-breakdown
GET /api/households/:householdId/reports/budget-status
```

### 7.8 Sincronizacion

```txt
POST /api/sync/push
GET  /api/sync/pull
POST /api/sync
```

Para MVP se recomienda un unico endpoint:

```txt
POST /api/sync
```

Request:

```json
{
  "householdId": "hh_123",
  "since": "2026-05-09T10:00:00.000Z",
  "clientId": "device_abc",
  "mutations": [
    {
      "clientMutationId": "uuid-1",
      "entity": "expense",
      "operation": "create",
      "localId": "local_expense_1",
      "baseVersion": null,
      "payload": {
        "categoryId": "cat_1",
        "amount": "12.50",
        "currency": "EUR",
        "description": "Supermercado",
        "date": "2026-05-09T12:00:00.000Z"
      }
    }
  ]
}
```

Response:

```json
{
  "serverTime": "2026-05-09T10:05:00.000Z",
  "applied": [
    {
      "clientMutationId": "uuid-1",
      "entity": "expense",
      "localId": "local_expense_1",
      "serverId": "exp_123",
      "version": 1
    }
  ],
  "conflicts": [],
  "changes": {
    "expenses": [],
    "categories": [],
    "budgets": [],
    "members": [],
    "receipts": []
  }
}
```

## 8. Offline-first en el cliente movil

### 8.1 Principio general movil

La app movil debe tratar SQLite como su fuente inmediata de lectura.

La UI no depende de que la API responda para:

- listar gastos ya conocidos;
- crear un gasto;
- editar un gasto;
- eliminar un gasto;
- adjuntar una foto;
- ver presupuestos/cacheados;
- consultar reportes locales basicos.

La API es la fuente de verdad global, pero no bloquea el uso diario.

### 8.2 Capas cliente

```txt
src/
├── core/
│   ├── api/
│   │   ├── client.ts
│   │   └── authInterceptor.ts
│   ├── db/
│   │   ├── database.ts
│   │   ├── migrations.ts
│   │   └── repositories/
│   ├── sync/
│   │   ├── syncEngine.ts
│   │   ├── mutationQueue.ts
│   │   ├── conflictResolver.ts
│   │   └── connectivity.ts
│   ├── storage/
│   │   ├── secureStorage.ts
│   │   └── fileStorage.ts
│   └── types/
├── features/
│   ├── auth/
│   ├── households/
│   ├── expenses/
│   ├── categories/
│   ├── budgets/
│   └── reports/
└── navigation/
```

### 8.3 SQLite local

Tablas locales recomendadas:

```txt
households
members
categories
expenses
budgets
receipts
sync_mutations
sync_metadata
```

Campos comunes:

```txt
id                server id cuando existe
local_id          id local temporal
sync_status       synced | pending | failed | conflict
version           version conocida del servidor
created_at
updated_at
deleted_at
last_synced_at
```

Tabla `sync_mutations`:

```txt
id
client_mutation_id
household_id
entity
operation
local_entity_id
server_entity_id
base_version
payload_json
status              pending | sending | applied | failed | conflict
retry_count
last_error
created_at
updated_at
```

### 8.4 Flujo al crear gasto offline

```txt
Usuario crea gasto
  ↓
Validacion local
  ↓
Insert en SQLite con local_id y sync_status=pending
  ↓
Insert en sync_mutations
  ↓
UI se actualiza inmediatamente
  ↓
syncEngine intenta enviar si hay conexion
  ↓
Servidor aplica mutacion
  ↓
Cliente reemplaza local_id por server_id
  ↓
sync_status=synced
```

### 8.5 Flujo al editar gasto offline

```txt
Usuario edita gasto
  ↓
Guardar cambio local
  ↓
Crear mutacion update con baseVersion
  ↓
UI muestra dato actualizado y estado "pendiente"
  ↓
Al sincronizar:
    - si version servidor coincide, aplicar
    - si version servidor cambio, resolver conflicto
```

### 8.6 Flujo al borrar gasto offline

No borrar fisicamente de SQLite al instante. Marcar:

```txt
deleted_at = now
sync_status = pending
```

Crear mutacion:

```json
{
  "entity": "expense",
  "operation": "delete",
  "baseVersion": 3
}
```

Cuando el servidor confirme, se puede:

- mantenerlo como tombstone por un tiempo;
- o purgarlo en una limpieza local posterior.

## 9. Sincronizacion

### 9.1 Estrategia MVP

Usar sincronizacion incremental por `updatedAt` + `version`.

Cada entidad sincronizable tiene:

- `updatedAt`;
- `deletedAt`;
- `version`.

El cliente guarda por hogar:

```txt
lastPulledAt
lastSuccessfulSyncAt
```

### 9.2 Orden de sincronizacion

En cada ciclo:

1. Comprobar conectividad.
2. Refrescar token si hace falta.
3. Enviar mutaciones pendientes.
4. Descargar cambios desde `lastPulledAt`.
5. Aplicar cambios en SQLite dentro de una transaccion.
6. Marcar mutaciones aplicadas.
7. Subir recibos pendientes.
8. Actualizar metadatos de sync.

### 9.3 Triggers de sincronizacion

La app debe intentar sincronizar:

- al abrir la app;
- al recuperar conexion;
- al volver al foreground;
- despues de crear/editar/borrar algo;
- cada cierto intervalo si la app esta activa;
- manualmente con boton "sincronizar".

### 9.4 Backoff

Si falla la sincronizacion:

```txt
reintento 1: 5 segundos
reintento 2: 15 segundos
reintento 3: 30 segundos
reintento 4: 2 minutos
reintento 5+: 5 minutos
```

No hacer bucles agresivos.

### 9.5 Idempotencia

Cada mutacion enviada al servidor debe incluir `clientMutationId`.

Si el cliente reenvia la misma mutacion porque no recibio respuesta, el servidor debe devolver la misma respuesta original sin duplicar datos.

Esto evita duplicar gastos cuando:

- se corta la conexion tras enviar;
- el servidor procesa pero el cliente no recibe respuesta;
- el usuario abre la app en una red inestable.

### 9.6 Resolucion de conflictos

Para MVP:

| Entidad | Estrategia |
| --- | --- |
| Expense create | siempre aplicar si el usuario es miembro |
| Expense update | last-write-wins si no hay conflicto grave |
| Expense delete | delete gana sobre update |
| Category update | last-write-wins |
| Category delete | archivar, no borrar si hay gastos |
| Budget update | last-write-wins |
| Member changes | servidor gana |

Conflicto grave:

- el gasto fue borrado en servidor y editado offline en cliente;
- la categoria fue archivada y el cliente crea gasto con ella;
- el usuario ya no pertenece al household;
- el presupuesto fue eliminado mientras el cliente lo editaba.

En esos casos la mutacion queda con `status=conflict` y la UI debe pedir accion o mostrar mensaje.

### 9.7 Politica practica de conflictos

Para una app familiar, no conviene abrumar al usuario con pantallas de merge.

Recomendacion:

- automatizar conflictos simples;
- mostrar conflictos solo cuando se pierda una accion del usuario;
- conservar siempre una copia local del payload fallido;
- permitir "reintentar", "descartar" o "crear copia".

## 10. Recibos y fotos offline

### 10.1 Flujo de captura

```txt
Usuario toma foto o elige de galeria
  ↓
Guardar archivo en almacenamiento local de la app
  ↓
Crear Receipt local con sync_status=pending
  ↓
Mostrar miniatura inmediatamente
  ↓
Cuando haya conexion:
    - subir archivo
    - crear/actualizar Receipt en servidor
    - guardar storageKey
    - marcar como synced
```

### 10.2 Reglas de archivos

- Maximo recomendado: 10 MB.
- Tipos permitidos:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `application/pdf`
- Generar thumbnails locales.
- Comprimir imagen antes de subir si supera un umbral.
- No confiar en el nombre original.
- Usar URLs firmadas temporales para descarga.

### 10.3 OCR futuro

El modelo `Receipt` ya incluye:

```txt
ocrStatus
ocrText
```

Estados sugeridos:

```txt
skipped
queued
processing
processed
failed
```

En v1.1 se puede anadir un worker:

```txt
receipt uploaded
  ↓
queue OCR job
  ↓
worker procesa imagen
  ↓
actualiza ocrText
  ↓
cliente recibe cambio por sync
```

## 11. Seguridad

### 11.1 Auth

- Passwords con bcrypt/argon2.
- Refresh tokens hasheados.
- Access token corto.
- Refresh token rotado.
- Revocar sesiones al detectar reutilizacion sospechosa.
- Guardar refresh token en SecureStore.
- Access token en memoria.

### 11.2 Autorizacion

Todas las queries deben validar membership:

```txt
userId pertenece a householdId
```

Nunca confiar en `householdId` enviado por el cliente sin verificar.

### 11.3 Storage de recibos

- Bucket privado.
- URLs firmadas temporales.
- Validar MIME real del archivo.
- Limitar tamano.
- Generar `storageKey` interno:

```txt
households/{householdId}/expenses/{expenseId}/receipts/{receiptId}.jpg
```

### 11.4 Rate limiting

Endpoints sensibles:

- login;
- register;
- refresh;
- upload de recibos;
- sync.

`/sync` no debe tener un limite demasiado bajo porque puede enviar varias operaciones acumuladas.

## 12. Manejo de monedas

### 12.1 MVP

- `Household.defaultCurrency = "EUR"`.
- Cada gasto tiene `currency`.
- Cada presupuesto tiene `currency`.
- Los reportes no convierten divisas automaticamente.
- Si hay varias monedas, los totales se devuelven agrupados.

Ejemplo:

```json
{
  "totals": [
    { "currency": "EUR", "amount": "420.50" },
    { "currency": "USD", "amount": "38.20" }
  ]
}
```

### 12.2 v1.1

Anadir tabla:

```txt
ExchangeRate
- baseCurrency
- quoteCurrency
- rate
- date
- provider
```

Asi se podran convertir reportes a la moneda base del hogar.

## 13. Reportes offline

Para MVP, el movil puede calcular reportes basicos desde SQLite:

- total del mes;
- total por categoria;
- ultimos gastos;
- presupuesto usado si tiene budgets cacheados.

El servidor sigue ofreciendo reportes oficiales, pero la app no queda vacia offline.

Cuando vuelva la conexion:

- sincroniza cambios;
- recalcula reportes locales;
- refresca reportes desde API si hace falta.

## 14. Estados de UI offline

La interfaz debe distinguir:

```txt
synced       guardado en servidor
pending      guardado local, pendiente de subir
syncing      enviando
failed       fallo sincronizacion
conflict     necesita revision
```

Ejemplos:

- Gasto creado offline: mostrarlo en la lista con indicador discreto.
- Foto pendiente: mostrar miniatura con estado "pendiente".
- Error persistente: mostrar opcion de reintentar.
- Sin conexion: banner pequeno, no modal bloqueante.

## 15. Interfaz web

### 15.1 Objetivo

La interfaz web permite gestionar la casa desde un ordenador o tablet con mayor comodidad que en el movil. Debe usar la misma API, los mismos tipos compartidos y el mismo sistema de permisos por household.

### 15.2 Alcance MVP web

- Login, logout y sesion persistente.
- Dashboard principal del hogar.
- Lista de gastos con filtros.
- Crear, editar y borrar gastos.
- Subida de tickets desde navegador.
- CRUD de categorias.
- CRUD de presupuestos.
- Reportes con tablas y graficos.
- Gestion basica de miembros e invitaciones.
- Responsive para desktop y tablet.

### 15.3 Fuera del MVP web

- Offline-first completo.
- Instalacion PWA.
- Notificaciones push web.
- Edicion colaborativa realtime.

### 15.4 Offline web por fases

En MVP la web sera online-first. Si el servidor no esta disponible, debe mostrar datos cacheados recientes cuando existan y bloquear operaciones que no pueda guardar con seguridad.

En v1.1 se puede activar PWA/offline con:

- service worker;
- IndexedDB;
- cola `sync_mutations` equivalente a movil;
- mismo endpoint `/api/sync`;
- indicadores `pending/synced/failed/conflict`.

La API debe disenarse desde el inicio para que web y movil puedan usar la misma sincronizacion, aunque web no la consuma completa en el MVP.

### 15.5 Stack web recomendado

| Area | Decision |
| --- | --- |
| Framework | Next.js |
| Lenguaje | TypeScript |
| UI | Tailwind CSS o componentes propios sobrios |
| Estado servidor | TanStack Query |
| Estado local | Zustand si hace falta |
| Formularios | React Hook Form + Zod |
| Graficos | Recharts o Tremor/Recharts |
| Tests | Playwright para flujos criticos |

### 15.6 Estructura web

```txt
apps/web/
├── src/
│   ├── app/
│   │   ├── login/
│   │   ├── households/
│   │   └── dashboard/
│   ├── features/
│   │   ├── auth/
│   │   ├── expenses/
│   │   ├── receipts/
│   │   ├── categories/
│   │   ├── budgets/
│   │   └── reports/
│   ├── core/
│   │   ├── api/
│   │   ├── auth/
│   │   └── ui/
│   └── types/
├── Dockerfile
+└── package.json
```

## 16. Backend: estructura recomendada

```txt
expense-api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── auth.types.ts
│   │   ├── households/
│   │   ├── expenses/
│   │   ├── categories/
│   │   ├── budgets/
│   │   ├── reports/
│   │   ├── receipts/
│   │   └── sync/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── logger.ts
│   │   ├── env.ts
│   │   └── storage.ts
│   └── app.ts
├── prisma/
├── Dockerfile
└── docker-compose.dev.yml
```

## 17. Frontend: estructura recomendada

```txt
apps/mobile/
├── src/
│   ├── core/
│   │   ├── api/
│   │   ├── db/
│   │   ├── sync/
│   │   ├── storage/
│   │   ├── ui/
│   │   └── types/
│   ├── features/
│   │   ├── auth/
│   │   ├── households/
│   │   ├── expenses/
│   │   ├── receipts/
│   │   ├── categories/
│   │   ├── budgets/
│   │   ├── reports/
│   │   └── home/
│   ├── navigation/
│   └── App.tsx
├── app.json
└── package.json
```

Los paquetes compartidos deben evitar duplicacion entre API, web y movil:

```txt
packages/shared/
├── src/
│   ├── schemas/
│   ├── types/
│   ├── constants/
│   └── money/
└── package.json

packages/api-client/
├── src/
│   ├── client.ts
│   ├── auth.ts
│   ├── expenses.ts
│   └── sync.ts
└── package.json
```

## 18. Plan de implementacion

### Semana 1 - Monorepo, Docker, backend base y auth

Objetivos:

- Backend arrancando con Docker.
- PostgreSQL local con Docker Compose.
- Prisma configurado.
- Auth segura.
- Sesiones activas limitadas a 5.

Tareas:

- Crear monorepo `apps/api`, `apps/mobile`, `apps/web` y `packages`.
- Crear proyecto backend TypeScript.
- Crear proyecto web Next.js TypeScript.
- Crear Dockerfile para API.
- Crear Dockerfile para Web.
- Crear `docker-compose.dev.yml`.
- Configurar Prisma.
- Crear modelos `User` y `Session`.
- Implementar register/login/refresh/logout/me.
- Guardar refresh tokens hasheados.
- Implementar limite de 5 sesiones.
- Crear middleware de auth.
- Crear middleware de errores.
- Crear health check.
- Tests de auth.

Criterio de aceptacion:

- `docker compose up` levanta API, Web y DB.
- `GET /api/health` responde OK.
- La web abre en `http://localhost:3001` y puede llamar a la API.
- Usuario puede registrarse y loguearse.
- Sexta sesion activa revoca la mas antigua o devuelve error controlado.

### Semana 2 - Households, categorias y base de sync

Objetivos:

- Crear y unirse a hogares.
- Gestionar miembros.
- Crear categorias.
- Definir primeras tablas offline/sync.

Tareas backend:

- Modelos `Household`, `Member`, `Category`.
- Endpoints households.
- Endpoints join/invite.
- Endpoints categories.
- Validar membership en todas las rutas.
- Crear endpoint inicial `/api/sync`.
- Crear tabla `ClientMutation`.

Tareas movil:

- Proyecto Expo.
- Navigation.
- Auth screens.
- SecureStore para tokens.
- SQLite inicial.
- Zustand stores base.
- Pantallas crear/unirse a hogar.

Criterio de aceptacion:

- Usuario crea hogar.
- Otro usuario se une con codigo.
- Categorias se crean y aparecen offline tras sincronizar.

### Semana 3 - Gastos offline-first

Objetivos:

- CRUD de gastos.
- Crear gastos sin conexion.
- Sincronizar al recuperar conexion.

Tareas backend:

- Modelo `Expense` con Decimal y currency.
- Endpoints de expenses.
- Validaciones Zod.
- Sync de create/update/delete expense.
- Idempotencia con `clientMutationId`.

Tareas movil:

- Tabla local `expenses`.
- Tabla local `sync_mutations`.
- Repositorios SQLite.
- `syncEngine`.
- NewExpenseScreen.
- ExpensesListScreen.
- Indicadores `pending/synced/failed`.

Criterio de aceptacion:

- Crear gasto offline.
- Cerrar y abrir app, el gasto sigue ahi.
- Volver online, el gasto se sube una sola vez.
- Si la request se reintenta, no duplica gasto.

### Semana 4 - Recibos, presupuestos y reportes

Objetivos:

- Adjuntar fotos de tickets.
- Subir fotos al recuperar conexion.
- Presupuestos mensuales.
- Reportes basicos.

Tareas backend:

- Modelo `Receipt`.
- Storage S3-compatible.
- Upload multipart.
- URL firmada de descarga.
- Modelos/endpoints budgets.
- Reportes summary/monthly/budget-status.

Tareas movil:

- Captura/seleccion de imagen.
- Guardado local de archivo.
- Cola de upload.
- Miniaturas.
- BudgetsScreen.
- ReportsScreen.
- Reportes locales basicos desde SQLite.

Criterio de aceptacion:

- Crear gasto con foto offline.
- La foto aparece localmente.
- Al volver online, se sube y queda asociada al gasto.
- Reportes muestran totales por moneda.

### Semana 5 - Hardening y despliegue

Objetivos:

- Despliegue Docker estable.
- Backups.
- Logs.
- Tests de flujos criticos.

Tareas:

- `docker-compose.prod.yml`.
- Reverse proxy con TLS.
- Script de migraciones.
- Script de backup PostgreSQL.
- Logging estructurado.
- Rate limiting.
- Tests E2E principales.
- Documentacion de setup.
- Checklist pre-lanzamiento.

Criterio de aceptacion:

- Servidor se despliega desde cero.
- Migraciones corren correctamente.
- Backups se generan.
- App movil apunta a la API de produccion.
- Web apunta a la API de produccion.
- Flujos criticos probados en dispositivo real.

## 19. Backups y recuperacion

### 19.1 PostgreSQL

Backup diario:

```bash
pg_dump "$DATABASE_URL" > "backup-$(date +%Y-%m-%d).sql"
```

Recomendaciones:

- Guardar backups fuera del servidor.
- Mantener al menos 7 diarios y 4 semanales.
- Probar restauracion antes de confiar en el backup.

### 19.2 Recibos

Si se usa S3/R2/Supabase:

- activar versionado si esta disponible;
- restringir acceso publico;
- hacer lifecycle de objetos borrados si aplica.

Si se usa MinIO self-hosted:

- respaldar el volumen;
- monitorizar espacio en disco;
- evitar que DB y storage vivan solo en el mismo disco sin copia externa.

## 20. Observabilidad

### Logs

Registrar:

- request id;
- user id cuando exista;
- household id cuando exista;
- endpoint;
- status code;
- duracion;
- errores de sync;
- errores de upload.

No registrar:

- passwords;
- tokens;
- refresh tokens;
- contenido completo de recibos;
- secretos de storage.

### Metricas recomendadas

- Error rate por endpoint.
- Latencia p95.
- Numero de mutaciones sync pendientes/fallidas.
- Uploads fallidos.
- Sesiones activas.
- Uso de storage.
- Tamano DB.

## 21. Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Duplicar gastos por reintentos | `clientMutationId` idempotente |
| Errores de redondeo | Decimal, nunca Float |
| Perdida de tickets offline | Guardar archivo local antes de crear upload |
| Conflictos entre dispositivos | version + estrategia de conflictos |
| Tokens robados | refresh token hasheado y rotado |
| Storage publico por error | bucket privado + URLs firmadas |
| Server caido | cliente continua con SQLite y cola local |
| DB inaccesible | API devuelve 503, cliente conserva mutaciones |
| Backups incompletos | backup DB + backup storage |

## 22. Checklist pre-lanzamiento

### Backend

- [ ] Dockerfile funcional.
- [ ] Compose dev funcional.
- [ ] Compose prod funcional.
- [ ] Migraciones versionadas.
- [ ] Health check.
- [ ] Auth con refresh rotation.
- [ ] Refresh tokens hasheados.
- [ ] Maximo 5 sesiones activas.
- [ ] Validacion Zod.
- [ ] Autorizacion por household.
- [ ] Decimal para dinero.
- [ ] Storage privado para recibos.
- [ ] Rate limiting.
- [ ] Logs estructurados.
- [ ] Backups probados.
- [ ] Tests auth.
- [ ] Tests expenses.
- [ ] Tests sync idempotente.

### Web

- [ ] Login/logout.
- [ ] Dashboard principal.
- [ ] CRUD gastos.
- [ ] CRUD categorias.
- [ ] CRUD presupuestos.
- [ ] Reportes.
- [ ] Subida de recibos.
- [ ] Gestion de invitaciones.
- [ ] Responsive desktop/tablet.
- [ ] Variables `NEXT_PUBLIC_API_URL` configuradas.
- [ ] Imagen Docker web funcional.
- [ ] Tests Playwright de flujo principal.

### Movil

- [ ] Login/register.
- [ ] SecureStore para refresh token.
- [ ] SQLite inicializado.
- [ ] Migraciones locales.
- [ ] Crear gasto offline.
- [ ] Editar gasto offline.
- [ ] Borrar gasto offline.
- [ ] Sync al volver conexion.
- [ ] Estados pending/synced/failed.
- [ ] Adjuntar foto offline.
- [ ] Subir foto pendiente.
- [ ] Reportes locales basicos.
- [ ] Manejo de errores visible.
- [ ] Pruebas en Android real.
- [ ] Pruebas en iOS real o simulador.

## 23. Orden recomendado de desarrollo

1. Monorepo base.
2. Backend Docker + PostgreSQL.
3. Web Docker base.
4. Auth y sesiones.
5. Households y miembros.
6. Categorias.
7. Web login y dashboard inicial.
8. SQLite movil y auth movil.
9. Gastos backend.
10. Gastos web online-first.
11. Gastos offline en movil.
12. Sync idempotente.
13. Recibos local + upload.
14. Recibos web.
15. Budgets.
16. Reports web y movil.
17. Hardening, backups y despliegue.

## 24. Decision final recomendada

La version mas equilibrada para este proyecto es:

- Dockerizar el backend, la web y la base de datos desde el dia 1.
- Organizar el proyecto como monorepo con `apps/api`, `apps/mobile`, `apps/web` y paquetes compartidos.
- Usar PostgreSQL como fuente de verdad.
- Usar SQLite en el movil como cache editable offline.
- Implementar la web online-first en MVP y preparar PWA/offline para v1.1.
- Sincronizar mediante cola de mutaciones idempotente.
- Guardar recibos en storage S3-compatible.
- Mantener OCR, splits y conversion automatica de divisas para v1.1.

Esto mantiene el MVP realista, pero evita reconstruir la arquitectura cuando se anadan OCR, sincronizacion mas avanzada o despliegues mas serios.






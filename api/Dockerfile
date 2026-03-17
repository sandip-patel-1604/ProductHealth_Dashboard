# ─── Development stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

# Install shared package first
COPY shared/package.json shared/package-lock.json* shared/
RUN cd shared && npm install

# Install API dependencies
COPY api/package.json api/package-lock.json* api/
RUN cd api && npm install

# Copy source (volumes override in dev)
COPY shared/ shared/
COPY api/ api/

EXPOSE 3000

# Run migration then start dev server
CMD sh -c "cd api && npx tsx src/db/migrate.ts && npx tsx watch src/index.ts"


# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY shared/ shared/
RUN cd shared && npm install && npm run build

COPY api/ api/
RUN cd api && npm install && npm run build


# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS prod

WORKDIR /app

COPY --from=build /app/api/dist ./dist
COPY --from=build /app/api/node_modules ./node_modules
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/shared/node_modules ./shared/node_modules

EXPOSE 3000

CMD ["node", "dist/index.js"]

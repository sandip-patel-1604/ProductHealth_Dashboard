# ─── Development stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

# Install shared package first (layer cache: only re-runs when package files change)
COPY shared/package.json shared/package-lock.json* shared/
RUN cd shared && npm install

# Install dashboard dependencies
COPY dashboard/package.json dashboard/package-lock.json* dashboard/
RUN cd dashboard && npm install

# Source is mounted as volumes at runtime — do NOT copy here for dev
EXPOSE 5173

CMD ["sh", "-c", "cd /app/dashboard && npm run dev"]


# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY shared/ shared/
RUN cd shared && npm install

COPY dashboard/package.json dashboard/package-lock.json* dashboard/
RUN cd dashboard && npm install

COPY dashboard/ dashboard/
RUN cd dashboard && npm run build


# ─── Production stage ─────────────────────────────────────────────────────────
FROM nginx:alpine AS prod

COPY --from=build /app/dashboard/dist /usr/share/nginx/html

# SPA routing: send all routes to index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ── Stage 1: Build the Vite client ───────────────────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /build

# Copy workspace manifests so npm ci can resolve the workspace
COPY package.json package-lock.json ./
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN npm ci

# Build the client
COPY packages/client/ packages/client/
RUN npm run build -w packages/client
# Output: /build/packages/client/dist/

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Install dependencies (tsx is a devDep but used as the runtime)
COPY package.json package-lock.json ./
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN npm ci

# Server source
COPY packages/server/src/ packages/server/src/

# Built client — served as static files when STATIC_DIR is set
COPY --from=client-build /build/packages/client/dist/ /srv/static/

ENV PORT=3001
ENV STATIC_DIR=/srv/static

EXPOSE 3001

CMD ["node_modules/.bin/tsx", "packages/server/src/index.ts"]

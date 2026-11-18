# syntax=docker/dockerfile:1

# Node.js 26 is the Active LTS line.
ARG NODE_IMAGE=node:26.13.1-trixie-slim

# Production dependencies only.
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Everything needed for type checking, tests and the mock Yahoo server.
FROM ${NODE_IMAGE} AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
USER node
CMD ["npm", "run", "check"]

# The app itself. Node.js runs the TypeScript sources directly, so no build step is needed.
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json app.ts ./
COPY bin ./bin
COPY lib ./lib
COPY routes ./routes
COPY views ./views
COPY public ./public
USER node
EXPOSE 3000
CMD ["node", "bin/www"]

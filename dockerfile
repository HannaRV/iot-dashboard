# syntax=docker/dockerfile:1.7

# Build stage: install production dependencies in isolation
FROM node:22.14.0-slim AS base
WORKDIR /usr/src/app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Runtime stage: only what is needed to run the app
FROM node:22.14.0-slim
WORKDIR /usr/src/app/backend

# Backend dependencies and source
COPY --from=base /usr/src/app/backend/node_modules ./node_modules
COPY backend/src ./src

# Frontend as sibling to backend (mirrors local dev structure so
# path.resolve(__dirname, '../../frontend') resolves identically in
# both environments)
COPY frontend/index.html frontend/style.css /usr/src/app/frontend/
COPY frontend/src /usr/src/app/frontend/src

EXPOSE 3000
ENV NODE_ENV=production
USER node
CMD ["node", "src/server.js"]

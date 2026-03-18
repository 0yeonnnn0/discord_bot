# --- Frontend build ---
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# --- Backend ---
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
COPY --from=frontend /app/frontend/dist ./frontend/dist
EXPOSE 3000
CMD ["node", "src/index.js"]

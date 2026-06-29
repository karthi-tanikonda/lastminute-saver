# -- Stage 1: Build the React frontend --------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# -- Stage 2: Production backend + bundled frontend -------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Copy backend dependencies and install
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Cloud Run sets PORT automatically; default to 8080
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Start from the backend directory
WORKDIR /app/backend
CMD ["npm", "start"]

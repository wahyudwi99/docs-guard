# Stage 1: Build state
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Stage 2: Runner state
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# You only need the standalone folder and the static/public assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build when output: 'standalone' is used
CMD ["node", "server.js"]

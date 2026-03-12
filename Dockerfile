FROM node:20-alpine

# Enable pnpm via corepack (matches the project's pnpm version)
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# Copy dependency files first — Docker caches this layer, so pnpm install
# only re-runs when package.json or pnpm-lock.yaml actually changes
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies — needed for tsx, typescript)
RUN pnpm install

# Generate Prisma client inside the container (uses the correct Linux binaries)
RUN pnpm prisma:generate

# Copy the rest of the source code
# In development, ./src and ./prisma are mounted as volumes via docker-compose,
# so changes you make on your machine reflect instantly without rebuilding
COPY . .

EXPOSE 3333

# On container start:
# 1. Apply any pending database migrations
# 2. Start the dev server with hot reload (tsx watch)
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm dev"]

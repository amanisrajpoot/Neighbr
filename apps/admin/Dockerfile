FROM node:20-alpine AS base

# ────────────────────────────────────────────────────
# deps: install all workspace dependencies
# ────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/ ./packages/
COPY apps/admin/package.json ./apps/admin/
COPY apps/mobile/package.json ./apps/mobile/

RUN npm install

# ────────────────────────────────────────────────────
# builder: build admin Next.js application
# ────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy the entire /app folder (including all root & workspace node_modules) from deps
COPY --from=deps /app ./
# Copy workspace source code (local node_modules excluded via .dockerignore)
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=@neighbr/admin

# ────────────────────────────────────────────────────
# runner: minimal production image
# ────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output and static assets
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/admin/server.js"]

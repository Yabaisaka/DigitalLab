FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 COOKIE_SECURE=true UPLOAD_DIR=/app/uploads
WORKDIR /app
RUN groupadd --gid 1001 lab && useradd --uid 1001 --gid lab --no-create-home lab && mkdir -p /app/uploads && chown lab:lab /app/uploads
COPY --from=build --chown=lab:lab /app/.next/standalone ./
COPY --from=build --chown=lab:lab /app/.next/static ./.next/static
COPY --from=build --chown=lab:lab /app/public ./public
COPY --from=build --chown=lab:lab /app/assets ./assets
USER lab
EXPOSE 3000
CMD ["node", "server.js"]

FROM build AS tools
ENV NODE_ENV=production
CMD ["npm", "run", "db:init"]

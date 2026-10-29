FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app/apps/api
ENV NODE_ENV=production WEB_DIST=/app/apps/web/dist UPLOAD_DIR=/data/uploads PRIVATE_UPLOAD_DIR=/data/private
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/web/dist /app/apps/web/dist
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/src ./src
COPY --from=build /app/apps/api/tsconfig.json ./
COPY --from=build /app/apps/api/seed-assets ./seed-assets
COPY --from=build /app/apps/api/package.json ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
# skema database disamakan dulu, baru server dijalankan
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]

FROM node:22-bookworm-slim AS foundry-app-build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY apps ./apps
COPY vite.mcp.config.mjs ./vite.mcp.config.mjs
RUN npm run build:mcp-app && test -s dist/index.html

FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
COPY data ./data
RUN node -e "const fs=require('node:fs'); const p=JSON.parse(fs.readFileSync('/app/data/researched-prospects.json','utf8')); if(!Array.isArray(p.prospects)) process.exit(1)"
COPY public ./public
COPY server.json ./server.json
COPY --from=foundry-app-build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node","src/server.mjs"]

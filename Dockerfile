FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
COPY public ./public
COPY server.json ./server.json
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node","src/server.mjs"]

# Build stage
# Node 25+ não distribui mais o corepack; instalamos o pnpm direto via npm
# (versão igual à de packageManager no package.json).
FROM node:22-slim AS builder
WORKDIR /app
RUN npm install -g pnpm@10.33.2
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Final stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

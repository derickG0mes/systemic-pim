FROM node:22-alpine AS build
WORKDIR /app

COPY front-end/package.json front-end/package-lock.json ./
RUN npm ci

COPY front-end/ ./
RUN npm run build

FROM nginx:alpine AS runtime
COPY front-end/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

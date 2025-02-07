FROM node:alpine AS builder

WORKDIR /app
COPY ./package*.json ./
RUN npm ci
COPY ./src ./src
COPY ./public ./public
COPY ./index.html ./
COPY ./tsconfig*.json ./
COPY ./vite.config.ts ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

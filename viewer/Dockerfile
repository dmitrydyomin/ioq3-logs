FROM node:15 AS builder

WORKDIR /app
COPY ./package*.json ./
RUN npm ci
COPY ./src ./src
COPY ./public ./public
COPY ./tsconfig.json ./tsconfig.json
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

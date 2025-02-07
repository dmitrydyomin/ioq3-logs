FROM node:alpine AS builder
WORKDIR /app
COPY ./package*.json ./
RUN npm ci
COPY ./src ./src
COPY ./tsconfig*.json ./
RUN npm run build

FROM node:alpine
WORKDIR /app
COPY ./package*.json ./
RUN npm ci --only=prod
COPY --from=builder /app/build ./build
COPY ./knexfile.js ./
COPY ./migrations ./migrations
EXPOSE 3001
USER node
CMD ["npm", "run", "serve"]

 # Development stage
FROM node:20-alpine AS development
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
USER node

# Build stage
FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
ENV TZ=America/Mexico_City
COPY --from=development /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build
ENV NODE_ENV=production
RUN npm ci --only=production && npm cache clean --force
USER node

# Production stage
FROM node:20-alpine AS production
WORKDIR /usr/src/app
RUN apk add --no-cache openssl ghostscript
ENV TZ=America/Mexico_City
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/src/main.js"]

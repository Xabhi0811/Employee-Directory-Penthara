FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Backend dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Shared package dependencies (includes zod)
COPY shared/package*.json /shared/
RUN npm install --prefix /shared --omit=dev

# Application source
COPY backend/ /app/
COPY shared/ /shared/

EXPOSE 5000

CMD ["npm", "start"]
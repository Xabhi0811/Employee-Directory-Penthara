FROM node:20-alpine AS build

WORKDIR /app/frontend

ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=${VITE_API_URL}

COPY frontend/package*.json ./

RUN npm ci

COPY shared/package.json /app/shared/package.json

RUN npm install --prefix /app/shared --omit=dev

COPY frontend/ ./
COPY shared/ /app/shared/

RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
# ---------------------------------------------
# Этап 1: Сборка React/Vite приложения
# ---------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Сначала копируем зависимости для эффективного кэширования слоев Docker
COPY package*.json ./
RUN npm ci

# Копируем остальные исходные файлы проекта
COPY . .

# Передаем URL бэкенда во время сборки Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Собираем production-бандл (генерирует папку dist)
RUN npm run build

# ---------------------------------------------
# Этап 2: Раздача статики через легковесный Nginx
# ---------------------------------------------
FROM nginx:alpine

# Копируем собранные файлы из первого этапа
COPY --from=builder /app/dist /usr/share/nginx/html

# Настраиваем Nginx для работы SPA (Single Page Application):
# любой запрос перенаправляется на index.html, чтобы работал React Router
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
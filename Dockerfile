# Dockerfile para FNFO Matchmaking Service
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 8082

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=8082

# Comando para iniciar
CMD ["node", "src/index.js"]
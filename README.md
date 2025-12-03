# fnfo-matchmakingservice
Matchmaking microservice for FNFO (Friday Night Funkin' Online) — manages room creation and player matching using Redis for session handling and load balancing.

## ✨ Características

- 🎮 Matchmaking automático con dos modos de juego (PVP y BOSS)
- 🔄 Comunicación en tiempo real con Socket.IO
- 🚦 Rate limiting para prevenir spam y abuso
- 🧹 Limpieza automática de colas y salas expiradas
- 📊 API REST completa para gestión de salas
- 🔒 Validación de datos y manejo de errores
- 📝 Logging estructurado con Winston
- ⚡ Redis para alta performance y pub/sub

### Ejecutar

1. verificar redis

    ```docker run -d -p 6379:6379 --name redis redis:7-alpine```

- Verificar si ya está corriendo

    ```docker ps | grep redis```

2. Configurar variables de entorno

    ```bash
    cp .env.example .env
    # Editar .env con tus configuraciones
    ```

3. Iniciar el servicio

    ```npm run dev```

## 🔐 Rate Limiting

El servicio incluye rate limiting en múltiples niveles:

### REST API
- **General**: 100 requests / 15 minutos por IP
- **Matchmaking** (join/leave): 10 requests / minuto por jugador
- **Consultas** (status, stats): 30 requests / minuto
- **Admin** (start/finish/delete): 5 requests / minuto

### WebSocket
- **join-matchmaking**: 5 eventos / minuto
- **leave-matchmaking**: 5 eventos / minuto
- **get-queue-info**: 20 eventos / minuto

## 🧹 Limpieza Automática

El servicio ejecuta limpieza cada 5 minutos:
- ✅ Remueve jugadores en cola por más de 30 minutos (configurable)
- ✅ Elimina salas finalizadas antiguas (2 horas por defecto)
- ✅ Limpia salas abandonadas sin jugadores suficientes
- ✅ Elimina salas vacías automáticamente

## 📝 Variables de Entorno

Ver `.env.example` para todas las opciones configurables.


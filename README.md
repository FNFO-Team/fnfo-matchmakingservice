# fnfo-matchmakingservice
Matchmaking microservice for FNFO (Friday Night Funkin’ Online) — manages room creation and player matching using Redis for session handling and load balancing.


### Ejecutar

1. verificar redis

    ```docker run -d -p 6379:6379 --name redis redis:7-alpine```

- Verificar si ya está corriendo

    ```docker ps | grep redis```

2. Iniciar el servicio

    ```npm run dev```


# Comandos Útiles para el Proyecto

## 🚀 Inicialización

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/observer-microservices.git
cd observer-microservices

# Construir e iniciar todos los servicios
docker-compose up --build

# Iniciar en modo detached (segundo plano)
docker-compose up -d --build

# Iniciar solo RabbitMQ
docker-compose up rabbitmq
```

## 📊 Monitoreo y Logs

```bash
# Ver logs de todos los servicios en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f producer-api
docker-compose logs -f email-service
docker-compose logs -f sms-service
docker-compose logs -f inventory-service
docker-compose logs -f analytics-service

# Ver últimas 100 líneas de logs
docker-compose logs --tail=100

# Ver logs desde un tiempo específico
docker-compose logs --since 5m
docker-compose logs --since 2024-11-14T10:00:00
```

## 🔄 Gestión de Servicios

```bash
# Ver estado de todos los contenedores
docker-compose ps

# Detener todos los servicios
docker-compose stop

# Detener un servicio específico
docker-compose stop email-service

# Iniciar servicios detenidos
docker-compose start

# Reiniciar todos los servicios
docker-compose restart

# Reiniciar un servicio específico
docker-compose restart producer-api

# Detener y eliminar contenedores
docker-compose down

# Detener, eliminar contenedores Y volúmenes
docker-compose down -v
```

## 📈 Escalabilidad

```bash
# Escalar un servicio a 3 instancias
docker-compose up -d --scale email-service=3

# Escalar múltiples servicios
docker-compose up -d --scale email-service=3 --scale sms-service=2

# Ver las instancias escaladas
docker-compose ps

# Ver logs de todas las instancias de un servicio
docker-compose logs -f email-service
```

## 🔧 Debugging

```bash
# Entrar a un contenedor en ejecución
docker-compose exec producer-api sh
docker-compose exec rabbitmq bash

# Ejecutar comando dentro del contenedor
docker-compose exec producer-api npm list

# Ver información detallada de un servicio
docker-compose config
docker inspect observer-microservices_producer-api_1

# Ver uso de recursos
docker stats

# Ver redes creadas
docker network ls
docker network inspect observer-microservices_microservices-network
```

## 🧪 Testing

```bash
# Dar permisos de ejecución al script de pruebas
chmod +x test-api.sh

# Ejecutar el script de pruebas
./test-api.sh

# Hacer request manual con curl
curl http://localhost:3000/health

# Crear una orden
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "productId": "laptop-pro",
    "quantity": 2,
    "totalAmount": 2999.98
  }'

# Ver respuesta formateada con jq (si está instalado)
curl -s http://localhost:3000/health | jq '.'
```

## 🧹 Limpieza

```bash
# Limpiar contenedores detenidos
docker container prune -f

# Limpiar imágenes no utilizadas
docker image prune -a -f

# Limpiar volúmenes no utilizados
docker volume prune -f

# Limpiar todo el sistema Docker
docker system prune -a -f --volumes

# Eliminar imágenes específicas del proyecto
docker rmi observer-microservices_producer-api
docker rmi observer-microservices_email-service
docker rmi observer-microservices_sms-service
docker rmi observer-microservices_inventory-service
docker rmi observer-microservices_analytics-service
```

## 🔍 RabbitMQ Management

```bash
# Acceder a RabbitMQ Management UI
# URL: http://localhost:15672
# Usuario: guest
# Password: guest

# Ver queues vía API
curl -u guest:guest http://localhost:15672/api/queues

# Ver exchanges
curl -u guest:guest http://localhost:15672/api/exchanges

# Ver connections
curl -u guest:guest http://localhost:15672/api/connections

# Purgar una queue (vaciarla)
curl -u guest:guest -X DELETE \
  http://localhost:15672/api/queues/%2F/email_queue/contents
```

## 🐛 Troubleshooting

### Problema: RabbitMQ no inicia

```bash
# Verificar logs de RabbitMQ
docker-compose logs rabbitmq

# Eliminar volumen y reiniciar
docker-compose down -v
docker-compose up rabbitmq

# Verificar puerto disponible
netstat -an | grep 5672
lsof -i :5672
```

### Problema: Servicios no se conectan a RabbitMQ

```bash
# Verificar que RabbitMQ esté healthy
docker-compose ps

# Reiniciar servicios
docker-compose restart

# Ver logs para identificar error
docker-compose logs -f email-service

# Verificar red
docker network inspect observer-microservices_microservices-network
```

### Problema: Puerto 3000 ya está en uso

```bash
# Encontrar qué proceso usa el puerto
lsof -i :3000
netstat -an | grep 3000

# Matar el proceso (reemplaza PID)
kill -9 PID

# O cambiar el puerto en docker-compose.yml
# ports:
#   - "3001:3000"  # Mapear a puerto 3001
```

### Problema: Cambios en código no se reflejan

```bash
# Reconstruir la imagen específica
docker-compose build producer-api

# Reconstruir todas las imágenes
docker-compose build

# Forzar reconstrucción sin cache
docker-compose build --no-cache

# Reiniciar con rebuild
docker-compose up --build
```

### Problema: Logs muestran errores de conexión

```bash
# Verificar que todos los servicios estén en la misma red
docker network inspect observer-microservices_microservices-network

# Verificar DNS interno
docker-compose exec producer-api ping rabbitmq

# Reiniciar todo limpiamente
docker-compose down -v
docker-compose up --build
```

## 📦 Reconstrucción Completa

```bash
# Limpieza total y reconstrucción desde cero
docker-compose down -v
docker system prune -a -f --volumes
docker-compose build --no-cache
docker-compose up
```

## 🎯 Workflow Recomendado para Desarrollo

```bash
# 1. Iniciar servicios
docker-compose up -d --build

# 2. Ver logs en tiempo real
docker-compose logs -f

# 3. Hacer cambios en código

# 4. Reconstruir servicio modificado
docker-compose up -d --build producer-api

# 5. Verificar cambios
curl http://localhost:3000/health

# 6. Al terminar
docker-compose down
```

## 📱 Comandos para la Demostración

```bash
# Terminal 1: Logs en tiempo real
docker-compose logs -f

# Terminal 2: Hacer requests
./test-api.sh

# Browser: RabbitMQ UI
open http://localhost:15672
```

## 🔐 Variables de Entorno

```bash
# Ver variables de un servicio
docker-compose exec producer-api env

# Ejecutar con variables personalizadas
RABBITMQ_URL=amqp://myuser:mypass@rabbitmq:5672 docker-compose up
```

## 📊 Métricas y Performance

```bash
# Ver uso de CPU y memoria en tiempo real
docker stats

# Ver tamaño de imágenes
docker images | grep observer

# Ver logs de errores solamente
docker-compose logs | grep ERROR
docker-compose logs | grep -i error

# Contar mensajes en logs
docker-compose logs email-service | grep "Evento recibido" | wc -l
```

## 🚢 Exportar e Importar

```bash
# Guardar imagen a archivo
docker save observer-microservices_producer-api > producer-api.tar

# Cargar imagen desde archivo
docker load < producer-api.tar

# Exportar docker-compose para otra máquina
docker-compose config > docker-compose-export.yml
```

## ⚡ Shortcuts Útiles

```bash
# Alias útiles (agregar a ~/.bashrc o ~/.zshrc)
alias dcup='docker-compose up -d --build'
alias dcdown='docker-compose down'
alias dclogs='docker-compose logs -f'
alias dcps='docker-compose ps'
alias dcrestart='docker-compose restart'

# Después de agregar los alias
source ~/.bashrc  # o source ~/.zshrc
```

## 🎓 Para la Sustentación

```bash
# Secuencia recomendada de comandos para demo:

# 1. Mostrar servicios corriendo
docker-compose ps

# 2. Abrir logs en tiempo real
docker-compose logs -f &

# 3. Abrir RabbitMQ UI
open http://localhost:15672

# 4. Crear orden
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","productId":"laptop","quantity":1,"totalAmount":1500}'

# 5. Demostrar resiliencia
docker-compose stop email-service
# crear orden
docker-compose start email-service

# 6. Demostrar escalabilidad
docker-compose up -d --scale email-service=3
docker-compose ps

# 7. Ver métricas
docker stats --no-stream
```
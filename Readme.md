# Sistema de Notificaciones E-commerce - Patrón Observer/Event-Driven

## 📚 Descripción del Proyecto

Este proyecto demuestra la implementación del **patrón Observer/Event-Driven** en una arquitectura de microservicios, simulando un sistema de notificaciones para un e-commerce.

## 🎯 Patrón Observer/Event-Driven

### ¿Qué es?

El patrón Observer/Event-Driven es un patrón de diseño de comportamiento donde un objeto (el **subject** o **publisher**) mantiene una lista de dependientes (los **observers** o **subscribers**) y los notifica automáticamente de cualquier cambio de estado, usualmente mediante el envío de eventos.

En arquitecturas de microservicios, este patrón se implementa típicamente mediante:
- **Message Brokers** (RabbitMQ, Apache Kafka, Redis Pub/Sub)
- **Event Buses**
- **Webhooks**

### Características Principales

1. **Desacoplamiento**: Los servicios no necesitan conocerse directamente entre sí
2. **Escalabilidad**: Fácil agregar nuevos consumidores sin modificar productores
3. **Asincronía**: Los servicios procesan eventos de forma independiente
4. **Resiliencia**: Si un consumidor falla, no afecta a otros
5. **Auditoría**: Todos los eventos pueden ser registrados y reproducidos

### Ventajas ✅

- **Bajo acoplamiento**: Los servicios son independientes
- **Flexibilidad**: Fácil agregar o remover servicios
- **Escalabilidad horizontal**: Cada servicio escala independientemente
- **Tolerancia a fallos**: Un servicio caído no detiene el sistema
- **Procesamiento asíncrono**: Mejora la responsividad del sistema
- **Auditoría y trazabilidad**: Historial completo de eventos

### Desventajas ❌

- **Complejidad**: Más difícil de entender y debuggear
- **Eventual consistency**: Los datos no son inmediatamente consistentes
- **Duplicación de eventos**: Requiere manejo de idempotencia
- **Monitoreo complejo**: Más puntos de falla a supervisar
- **Overhead de infraestructura**: Requiere message brokers adicionales
- **Debugging difícil**: El flujo no es lineal

### Casos de Uso Reales

1. **E-commerce**: 
   - Amazon usa eventos para coordinar inventario, pagos, envíos y notificaciones
   - Shopify procesa millones de eventos diarios para actualizar estados de órdenes

2. **Sistemas Financieros**:
   - PayPal usa event-driven para procesar transacciones y detección de fraude
   - Bancos procesan eventos de transacciones en tiempo real

3. **Redes Sociales**:
   - Twitter/X publica eventos cuando usuarios publican tweets
   - Instagram notifica eventos de likes, comentarios y menciones

4. **IoT y Monitoreo**:
   - Sistemas de smart homes reaccionan a eventos de sensores
   - Plataformas de monitoreo de infraestructura (Datadog, New Relic)

## 🏗️ Arquitectura del Demo

```
┌─────────────────┐
│  Producer API   │ (Puerto 3000)
│  (Node.js)      │
└────────┬────────┘
         │ Publica eventos
         ▼
┌─────────────────┐
│   RabbitMQ      │ (Puerto 5672, UI: 15672)
│ Message Broker  │
└────────┬────────┘
         │ Distribuye eventos
         ├──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │ Email  │ │  SMS   │ │Inventory│ │Analytics│
    │Service │ │Service │ │Service  │ │Service  │
    └────────┘ └────────┘ └────────┘ └────────┘
```

### Componentes

1. **Producer API**: REST API que genera eventos de negocio
2. **RabbitMQ**: Message broker que distribuye eventos
3. **Email Service**: Envía notificaciones por email
4. **SMS Service**: Envía notificaciones por SMS
5. **Inventory Service**: Actualiza inventario
6. **Analytics Service**: Registra métricas y estadísticas

## 🚀 Requisitos Previos

- Docker Desktop instalado (versión 20.10+)
- Docker Compose instalado (versión 2.0+)
- Git
- Un navegador web
- (Opcional) Postman o curl para probar la API

## 📦 Instalación y Ejecución

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/observer-microservices.git
cd observer-microservices
```

### 2. Iniciar los Servicios

```bash
# Construir las imágenes y levantar todos los servicios
docker-compose up --build

# O en segundo plano (detached mode)
docker-compose up -d --build
```

### 3. Verificar que los Servicios Estén Corriendo

```bash
docker-compose ps
```

Deberías ver 6 servicios corriendo:
- producer-api (puerto 3000)
- rabbitmq (puertos 5672, 15672)
- email-service
- sms-service
- inventory-service
- analytics-service

### 4. Acceder a la Interfaz de RabbitMQ

Abre tu navegador en: http://localhost:15672

- **Usuario**: guest
- **Password**: guest

Aquí podrás ver en tiempo real los mensajes fluyendo entre servicios.

## 🧪 Pruebas del Sistema

### Endpoint Disponible

**POST** `http://localhost:3000/orders`

Crea una nueva orden y dispara eventos.

### Ejemplo con curl

```bash
# Crear una orden nueva
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "productId": "prod456",
    "quantity": 2,
    "totalAmount": 199.99
  }'
```

### Ejemplo con Postman

1. Crear una nueva request POST
2. URL: `http://localhost:3000/orders`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "userId": "user789",
  "productId": "laptop-pro",
  "quantity": 1,
  "totalAmount": 1499.99
}
```

### 5. Ver los Logs

Para ver los logs de todos los servicios procesando eventos:

```bash
# Logs de todos los servicios
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f email-service
docker-compose logs -f sms-service
docker-compose logs -f inventory-service
docker-compose logs -f analytics-service
```

## 📊 Flujo de Eventos

Cuando creas una orden, ocurre lo siguiente:

1. **Producer API** recibe la petición HTTP POST
2. **Producer API** publica un evento `order.created` a RabbitMQ
3. **RabbitMQ** distribuye el evento a todos los subscribers
4. Cada servicio procesa el evento independientemente:
   - **Email Service**: Envía confirmación por email
   - **SMS Service**: Envía notificación SMS
   - **Inventory Service**: Reduce el stock
   - **Analytics Service**: Registra métricas de venta

Todo esto ocurre de forma **asíncrona** y **desacoplada**.

## 🛠️ Comandos Útiles

```bash
# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (limpieza completa)
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart email-service

# Ver logs en tiempo real
docker-compose logs -f

# Escalar un servicio (ej: 3 instancias de email-service)
docker-compose up -d --scale email-service=3

# Reconstruir un servicio específico
docker-compose up -d --build email-service
```

## 📁 Estructura del Proyecto

```
observer-microservices/
│
├── producer-api/
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── email-service/
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── sms-service/
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── inventory-service/
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── analytics-service/
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

## 🔍 Conceptos Clave Implementados

### 1. **Publisher/Subscriber Pattern**
Los servicios no se comunican directamente, sino a través de eventos.

### 2. **Message Queue**
RabbitMQ asegura que los mensajes no se pierdan y se entreguen a todos los interesados.

### 3. **Desacoplamiento Temporal**
Los servicios no necesitan estar disponibles al mismo tiempo.

### 4. **Idempotencia**
Cada servicio puede recibir el mismo evento múltiples veces sin efectos adversos.

### 5. **Escalabilidad Independiente**
Cada servicio puede escalar según su carga específica.

## 🎓 Para la Sustentación

### Puntos Clave a Explicar:

1. **Diferencia entre síncrono vs asíncrono**
2. **Por qué usar message brokers**
3. **Ventajas del desacoplamiento**
4. **Casos donde event-driven NO es la mejor opción**
5. **Cómo manejar fallos en el sistema**
6. **Diferencias con llamadas REST directas**

### Demo en Vivo:

1. Mostrar RabbitMQ Management UI
2. Crear una orden y mostrar logs en tiempo real
3. Apagar un servicio, crear orden, prender servicio (resiliencia)
4. Escalar un servicio horizontalmente

## 🐛 Troubleshooting

### RabbitMQ no inicia
```bash
docker-compose down -v
docker-compose up rabbitmq
```

### Los servicios no se conectan a RabbitMQ
Espera 10-15 segundos después de iniciar RabbitMQ antes de iniciar otros servicios.

### Limpiar todo y empezar de nuevo
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## 📚 Referencias

- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Microservices Patterns](https://microservices.io/patterns/data/event-driven-architecture.html)

## 👥 Autores

[Nombres de los integrantes del grupo]

## 📝 Licencia

MIT License
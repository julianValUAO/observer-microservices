const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'orders_exchange';

let channel = null;
let connection = null;

// Función para conectar a RabbitMQ con reintentos
async function connectToRabbitMQ() {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`🔄 Intentando conectar a RabbitMQ (intento ${retries + 1}/${maxRetries})...`);
      
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      // Crear exchange tipo 'fanout' (broadcast a todos los subscribers)
      await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

      console.log('✅ Producer API conectado a RabbitMQ exitosamente');
      console.log(`📡 Exchange '${EXCHANGE_NAME}' creado/verificado`);
      
      return;
    } catch (error) {
      retries++;
      console.error(`❌ Error conectando a RabbitMQ (intento ${retries}/${maxRetries}):`, error.message);
      
      if (retries < maxRetries) {
        console.log('⏳ Esperando 5 segundos antes de reintentar...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('💥 No se pudo conectar a RabbitMQ después de múltiples intentos');
        process.exit(1);
      }
    }
  }
}

// Función para publicar eventos
async function publishEvent(eventType, data) {
  try {
    const event = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
      eventId: `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const message = JSON.stringify(event);
    
    channel.publish(
      EXCHANGE_NAME,
      '', // routing key vacío para fanout exchange
      Buffer.from(message),
      { persistent: true }
    );

    console.log(`📤 Evento publicado: ${eventType}`);
    console.log(`   Event ID: ${event.eventId}`);
    console.log(`   Data:`, data);
    
    return event;
  } catch (error) {
    console.error('❌ Error publicando evento:', error);
    throw error;
  }
}

// ============================================
// ENDPOINTS DE LA API
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'producer-api',
    rabbitmq: channel ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Crear una nueva orden
app.post('/orders', async (req, res) => {
  try {
    const { userId, productId, quantity, totalAmount } = req.body;

    // Validación básica
    if (!userId || !productId || !quantity || !totalAmount) {
      return res.status(400).json({
        error: 'Campos requeridos: userId, productId, quantity, totalAmount'
      });
    }

    // Crear datos de la orden
    const orderData = {
      orderId: `ORD-${Date.now()}`,
      userId,
      productId,
      quantity,
      totalAmount,
      status: 'created',
      createdAt: new Date().toISOString()
    };

    // Publicar evento
    const event = await publishEvent('order.created', orderData);

    // Responder al cliente
    res.status(201).json({
      message: 'Orden creada exitosamente',
      order: orderData,
      event: {
        eventId: event.eventId,
        eventType: event.eventType,
        timestamp: event.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Error creando orden:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Simular pago de orden
app.post('/orders/:orderId/payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod, amount } = req.body;

    const paymentData = {
      orderId,
      paymentMethod: paymentMethod || 'credit_card',
      amount,
      status: 'completed',
      transactionId: `TXN-${Date.now()}`,
      paidAt: new Date().toISOString()
    };

    const event = await publishEvent('payment.completed', paymentData);

    res.status(200).json({
      message: 'Pago procesado exitosamente',
      payment: paymentData,
      event: {
        eventId: event.eventId,
        eventType: event.eventType
      }
    });

  } catch (error) {
    console.error('❌ Error procesando pago:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simular envío de orden
app.post('/orders/:orderId/shipment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { address, carrier } = req.body;

    const shipmentData = {
      orderId,
      trackingNumber: `TRK-${Date.now()}`,
      carrier: carrier || 'DHL',
      address,
      status: 'shipped',
      shippedAt: new Date().toISOString()
    };

    const event = await publishEvent('order.shipped', shipmentData);

    res.status(200).json({
      message: 'Orden enviada exitosamente',
      shipment: shipmentData,
      event: {
        eventId: event.eventId,
        eventType: event.eventType
      }
    });

  } catch (error) {
    console.error('❌ Error procesando envío:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint raíz con información de la API
app.get('/', (req, res) => {
  res.json({
    service: 'Producer API - Observer/Event-Driven Pattern',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      createOrder: 'POST /orders',
      processPayment: 'POST /orders/:orderId/payment',
      shipOrder: 'POST /orders/:orderId/shipment'
    },
    documentation: 'Ver README.md para más detalles'
  });
});

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================

async function startServer() {
  try {
    // Conectar a RabbitMQ primero
    await connectToRabbitMQ();

    // Iniciar servidor Express
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(50));
      console.log('🚀 PRODUCER API INICIADO');
      console.log('='.repeat(50));
      console.log(`📍 Puerto: ${PORT}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log(`📡 RabbitMQ: ${RABBITMQ_URL}`);
      console.log(`📊 Exchange: ${EXCHANGE_NAME}`);
      console.log('='.repeat(50));
      console.log('');
      console.log('💡 Endpoints disponibles:');
      console.log(`   GET  http://localhost:${PORT}/`);
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log(`   POST http://localhost:${PORT}/orders`);
      console.log('');
    });

  } catch (error) {
    console.error('💥 Error fatal iniciando el servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recibido, cerrando conexiones...');
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT recibido, cerrando conexiones...');
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});

// Iniciar la aplicación
startServer();
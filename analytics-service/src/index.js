const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'orders_exchange';
const QUEUE_NAME = 'analytics_queue';
const SERVICE_NAME = process.env.SERVICE_NAME || 'analytics-service';

let channel = null;
let connection = null;

// Métricas simuladas
const metrics = {
  totalOrders: 0,
  totalRevenue: 0,
  totalPayments: 0,
  totalShipments: 0,
  ordersByProduct: {},
  eventsByType: {}
};

// Registrar métrica
function recordMetric(eventType, data) {
  console.log('');
  console.log('📊 ═══════════════════════════════════════════════');
  console.log('   REGISTRANDO MÉTRICA');
  console.log('═══════════════════════════════════════════════');

  // Incrementar contador de eventos por tipo
  metrics.eventsByType[eventType] = (metrics.eventsByType[eventType] || 0) + 1;

  switch (eventType) {
    case 'order.created':
      metrics.totalOrders++;
      metrics.totalRevenue += parseFloat(data.totalAmount || 0);
      
      const productId = data.productId;
      if (!metrics.ordersByProduct[productId]) {
        metrics.ordersByProduct[productId] = {
          count: 0,
          totalQuantity: 0,
          totalRevenue: 0
        };
      }
      metrics.ordersByProduct[productId].count++;
      metrics.ordersByProduct[productId].totalQuantity += data.quantity;
      metrics.ordersByProduct[productId].totalRevenue += parseFloat(data.totalAmount || 0);
      
      console.log(`   Tipo: Nueva Orden`);
      console.log(`   Order ID: ${data.orderId}`);
      console.log(`   Producto: ${productId}`);
      console.log(`   Cantidad: ${data.quantity}`);
      console.log(`   Monto: $${data.totalAmount}`);
      break;

    case 'payment.completed':
      metrics.totalPayments++;
      console.log(`   Tipo: Pago Completado`);
      console.log(`   Order ID: ${data.orderId}`);
      console.log(`   Monto: $${data.amount}`);
      console.log(`   Método: ${data.paymentMethod}`);
      break;

    case 'order.shipped':
      metrics.totalShipments++;
      console.log(`   Tipo: Orden Enviada`);
      console.log(`   Order ID: ${data.orderId}`);
      console.log(`   Transportadora: ${data.carrier}`);
      break;
  }

  console.log(`   Timestamp: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
}

// Mostrar reporte de métricas
function displayMetricsReport() {
  console.log('');
  console.log('═'.repeat(70));
  console.log('📈 REPORTE DE MÉTRICAS Y ANALYTICS');
  console.log('═'.repeat(70));
  console.log('');
  
  console.log('📦 RESUMEN GENERAL:');
  console.log(`   • Órdenes totales: ${metrics.totalOrders}`);
  console.log(`   • Revenue total: $${metrics.totalRevenue.toFixed(2)}`);
  console.log(`   • Pagos procesados: ${metrics.totalPayments}`);
  console.log(`   • Envíos realizados: ${metrics.totalShipments}`);
  console.log('');
  
  if (Object.keys(metrics.ordersByProduct).length > 0) {
    console.log('🏆 TOP PRODUCTOS:');
    const sortedProducts = Object.entries(metrics.ordersByProduct)
      .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
      .slice(0, 5);
    
    sortedProducts.forEach(([productId, stats], index) => {
      console.log(`   ${index + 1}. ${productId}`);
      console.log(`      Órdenes: ${stats.count} | Unidades: ${stats.totalQuantity} | Revenue: $${stats.totalRevenue.toFixed(2)}`);
    });
    console.log('');
  }
  
  console.log('📋 EVENTOS POR TIPO:');
  Object.entries(metrics.eventsByType).forEach(([type, count]) => {
    console.log(`   • ${type}: ${count} eventos`);
  });
  
  console.log('');
  console.log('═'.repeat(70));
  console.log('');
}

// Procesar diferentes tipos de eventos
async function processEvent(event) {
  const { eventType, data, eventId, timestamp } = event;

  console.log(`🔔 Evento recibido: ${eventType}`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Timestamp: ${timestamp}`);

  try {
    recordMetric(eventType, data);
    
    // Mostrar reporte cada 3 eventos
    const totalEvents = Object.values(metrics.eventsByType).reduce((sum, count) => sum + count, 0);
    if (totalEvents % 3 === 0) {
      displayMetricsReport();
    }

    console.log('✅ Evento procesado exitosamente por Analytics Service\n');

  } catch (error) {
    console.error('❌ Error procesando evento:', error);
    throw error;
  }
}

// Conectar a RabbitMQ y consumir mensajes
async function connectAndConsume() {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`🔄 Intentando conectar a RabbitMQ (intento ${retries + 1}/${maxRetries})...`);

      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

      const queueResult = await channel.assertQueue(QUEUE_NAME, {
        durable: true
      });

      await channel.bindQueue(queueResult.queue, EXCHANGE_NAME, '');

      channel.prefetch(1);

      console.log('');
      console.log('═'.repeat(60));
      console.log('✅ ANALYTICS SERVICE CONECTADO A RABBITMQ');
      console.log('═'.repeat(60));
      console.log(`📡 Exchange: ${EXCHANGE_NAME}`);
      console.log(`📥 Queue: ${QUEUE_NAME}`);
      console.log(`🎯 Esperando eventos...`);
      console.log('═'.repeat(60));
      console.log('');

      channel.consume(queueResult.queue, async (msg) => {
        if (msg !== null) {
          try {
            const event = JSON.parse(msg.content.toString());
            await processEvent(event);
            channel.ack(msg);
          } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
            channel.nack(msg, false, true);
          }
        }
      });

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

// Mostrar reporte periódico cada 30 segundos
setInterval(() => {
  const totalEvents = Object.values(metrics.eventsByType).reduce((sum, count) => sum + count, 0);
  if (totalEvents > 0) {
    displayMetricsReport();
  }
}, 30000);

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recibido, cerrando conexiones...');
  displayMetricsReport();
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT recibido, cerrando conexiones...');
  displayMetricsReport();
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});

console.log('🚀 Iniciando Analytics Service...');
connectAndConsume();
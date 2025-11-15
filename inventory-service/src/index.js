const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'orders_exchange';
const QUEUE_NAME = 'inventory_queue';
const SERVICE_NAME = process.env.SERVICE_NAME || 'inventory-service';

let channel = null;
let connection = null;

// Base de datos simulada de inventario
const inventory = {
  'prod456': { name: 'Laptop Pro', stock: 50 },
  'laptop-pro': { name: 'Laptop Pro 15"', stock: 25 },
  'phone-x': { name: 'Phone X', stock: 100 },
  'tablet-s': { name: 'Tablet S', stock: 30 },
  'watch-3': { name: 'Smart Watch 3', stock: 75 }
};

// Actualizar inventario
function updateInventory(productId, quantity) {
  console.log('');
  console.log('📦 ═══════════════════════════════════════════════');
  console.log('   ACTUALIZANDO INVENTARIO');
  console.log('═══════════════════════════════════════════════');
  
  if (!inventory[productId]) {
    console.log(`   ⚠️  Producto no encontrado: ${productId}`);
    console.log(`   📝 Creando registro de inventario...`);
    inventory[productId] = { 
      name: `Producto ${productId}`, 
      stock: 100 
    };
  }

  const product = inventory[productId];
  const previousStock = product.stock;
  product.stock -= quantity;

  console.log(`   Producto: ${product.name} (${productId})`);
  console.log(`   Stock anterior: ${previousStock}`);
  console.log(`   Cantidad vendida: ${quantity}`);
  console.log(`   Stock actual: ${product.stock}`);
  console.log(`   Actualizado: ${new Date().toLocaleString()}`);
  
  if (product.stock < 10) {
    console.log(`   ⚠️  ALERTA: Stock bajo! Quedan ${product.stock} unidades`);
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log('');
}

// Mostrar estado del inventario
function displayInventoryStatus() {
  console.log('');
  console.log('📊 ESTADO ACTUAL DEL INVENTARIO:');
  console.log('─'.repeat(60));
  Object.entries(inventory).forEach(([id, product]) => {
    const status = product.stock < 10 ? '⚠️ BAJO' : product.stock < 30 ? '⚡ MEDIO' : '✅ ALTO';
    console.log(`   ${product.name} (${id}): ${product.stock} unidades ${status}`);
  });
  console.log('─'.repeat(60));
  console.log('');
}

// Procesar diferentes tipos de eventos
async function processEvent(event) {
  const { eventType, data, eventId, timestamp } = event;

  console.log(`🔔 Evento recibido: ${eventType}`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Timestamp: ${timestamp}`);

  try {
    switch (eventType) {
      case 'order.created':
        updateInventory(data.productId, data.quantity);
        displayInventoryStatus();
        break;

      case 'payment.completed':
        console.log(`💳 Pago confirmado para orden ${data.orderId} - No se requiere acción de inventario`);
        break;

      case 'order.shipped':
        console.log(`📦 Orden ${data.orderId} enviada - Inventario ya actualizado`);
        break;

      default:
        console.log(`⚠️  Tipo de evento no manejado: ${eventType}`);
    }

    console.log('✅ Evento procesado exitosamente por Inventory Service\n');

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
      console.log('✅ INVENTORY SERVICE CONECTADO A RABBITMQ');
      console.log('═'.repeat(60));
      console.log(`📡 Exchange: ${EXCHANGE_NAME}`);
      console.log(`📥 Queue: ${QUEUE_NAME}`);
      console.log(`🎯 Esperando eventos...`);
      console.log('═'.repeat(60));
      
      displayInventoryStatus();

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

console.log('🚀 Iniciando Inventory Service...');
connectAndConsume();
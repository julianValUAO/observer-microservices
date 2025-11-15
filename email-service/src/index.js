const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'orders_exchange';
const QUEUE_NAME = 'email_queue';
const SERVICE_NAME = process.env.SERVICE_NAME || 'email-service';

let channel = null;
let connection = null;

// Simular envío de email
function sendEmail(to, subject, body) {
  console.log('');
  console.log('📧 ═══════════════════════════════════════════════');
  console.log('   ENVIANDO EMAIL');
  console.log('═══════════════════════════════════════════════');
  console.log(`   Para: ${to}`);
  console.log(`   Asunto: ${subject}`);
  console.log(`   Mensaje: ${body}`);
  console.log(`   Enviado: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════');
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
        sendEmail(
          `user-${data.userId}@example.com`,
          '✅ Confirmación de Orden',
          `Hola! Tu orden ${data.orderId} ha sido creada exitosamente.\n` +
          `Producto: ${data.productId}\n` +
          `Cantidad: ${data.quantity}\n` +
          `Total: $${data.totalAmount}\n` +
          `\nGracias por tu compra!`
        );
        break;

      case 'payment.completed':
        sendEmail(
          `customer@example.com`,
          '💳 Pago Confirmado',
          `Tu pago para la orden ${data.orderId} ha sido procesado.\n` +
          `Monto: $${data.amount}\n` +
          `ID Transacción: ${data.transactionId}\n` +
          `Método: ${data.paymentMethod}`
        );
        break;

      case 'order.shipped':
        sendEmail(
          `customer@example.com`,
          '📦 Orden Enviada',
          `Tu orden ${data.orderId} ha sido enviada!\n` +
          `Transportadora: ${data.carrier}\n` +
          `Número de seguimiento: ${data.trackingNumber}\n` +
          `Dirección: ${data.address || 'No especificada'}`
        );
        break;

      default:
        console.log(`⚠️  Tipo de evento no manejado: ${eventType}`);
    }

    console.log('✅ Evento procesado exitosamente por Email Service\n');

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

      // Asegurar que el exchange existe
      await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

      // Crear cola exclusiva para este servicio
      const queueResult = await channel.assertQueue(QUEUE_NAME, {
        durable: true
      });

      // Bindear la cola al exchange (sin routing key en fanout)
      await channel.bindQueue(queueResult.queue, EXCHANGE_NAME, '');

      // Configurar prefetch (procesar 1 mensaje a la vez)
      channel.prefetch(1);

      console.log('');
      console.log('═'.repeat(60));
      console.log('✅ EMAIL SERVICE CONECTADO A RABBITMQ');
      console.log('═'.repeat(60));
      console.log(`📡 Exchange: ${EXCHANGE_NAME}`);
      console.log(`📥 Queue: ${QUEUE_NAME}`);
      console.log(`🎯 Esperando eventos...`);
      console.log('═'.repeat(60));
      console.log('');

      // Consumir mensajes
      channel.consume(queueResult.queue, async (msg) => {
        if (msg !== null) {
          try {
            const event = JSON.parse(msg.content.toString());
            await processEvent(event);
            
            // Acknowledger el mensaje (confirmar que fue procesado)
            channel.ack(msg);
          } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
            // Rechazar el mensaje y reencolarlo
            channel.nack(msg, false, true);
          }
        }
      });

      // Si llegamos aquí, la conexión fue exitosa
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

// Iniciar el servicio
console.log('🚀 Iniciando Email Service...');
connectAndConsume();
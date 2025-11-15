const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'orders_exchange';
const QUEUE_NAME = 'sms_queue';
const SERVICE_NAME = process.env.SERVICE_NAME || 'sms-service';

let channel = null;
let connection = null;

// Simular envío de SMS
function sendSMS(phoneNumber, message) {
  console.log('');
  console.log('📱 ═══════════════════════════════════════════════');
  console.log('   ENVIANDO SMS');
  console.log('═══════════════════════════════════════════════');
  console.log(`   Número: ${phoneNumber}`);
  console.log(`   Mensaje: ${message}`);
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
        sendSMS(
          '+57-300-123-4567',
          `Tu orden ${data.orderId} ha sido creada. Total: $${data.totalAmount}. Gracias por tu compra!`
        );
        break;

      case 'payment.completed':
        sendSMS(
          '+57-300-123-4567',
          `Pago confirmado para orden ${data.orderId}. Monto: $${data.amount}. ID: ${data.transactionId}`
        );
        break;

      case 'order.shipped':
        sendSMS(
          '+57-300-123-4567',
          `Tu orden ${data.orderId} ha sido enviada! Tracking: ${data.trackingNumber} via ${data.carrier}`
        );
        break;

      default:
        console.log(`⚠️  Tipo de evento no manejado: ${eventType}`);
    }

    console.log('✅ Evento procesado exitosamente por SMS Service\n');

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
      console.log('✅ SMS SERVICE CONECTADO A RABBITMQ');
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

console.log('🚀 Iniciando SMS Service...');
connectAndConsume();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Cliente de WhatsApp
let whatsappClient = null;
let qrCodeData = null;
let isReady = false;

// Inicializar cliente de WhatsApp
const initWhatsApp = () => {
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  // Evento: Generar QR
  whatsappClient.on('qr', async (qr) => {
    console.log('QR Code generado');
    qrCodeData = await qrcode.toDataURL(qr);
  });

  // Evento: Cliente listo
  whatsappClient.on('ready', () => {
    console.log('WhatsApp Client está listo!');
    isReady = true;
    qrCodeData = null;
  });

  // Evento: Mensaje recibido
  whatsappClient.on('message', async (message) => {
    console.log('Mensaje recibido:', message.body);
    
    try {
      // Extraer número de teléfono
      const phoneNumber = message.from.replace('@c.us', '');
      
      // Procesar comandos
      await processMessage(message, phoneNumber);
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  });

  whatsappClient.initialize();
};

// Procesar mensajes y comandos
const processMessage = async (message, phoneNumber) => {
  const text = message.body.trim().toUpperCase();
  
  // Comando: CONSULTAR
  if (text === 'CONSULTAR') {
    try {
      // Llamar a API de APEX para consultar cliente
      const response = await fetch(`http://tu-apex-url.com/ords/apex/api/clientes/${phoneNumber}`);
      const data = await response.json();
      
      if (data.success) {
        await message.reply(
          `📋 *Información del Cliente*\n\n` +
          `Nombre: ${data.nombre}\n` +
          `Teléfono: ${data.telefono}\n` +
          `Descuento actual: ${data.descuento}%\n` +
          `Estado: ${data.estado}`
        );
      } else {
        await message.reply('❌ Cliente no encontrado en el sistema.');
      }
    } catch (error) {
      await message.reply('⚠️ Error al consultar información. Intente nuevamente.');
    }
  }
  
  // Comando: DESCUENTO [porcentaje]
  else if (text.startsWith('DESCUENTO ')) {
    const descuento = text.replace('DESCUENTO ', '').trim();
    
    if (isNaN(descuento)) {
      await message.reply('❌ Formato incorrecto. Use: DESCUENTO 10');
      return;
    }
    
    try {
      // Llamar a API de APEX para actualizar descuento
      const response = await fetch('http://tu-apex-url.com/ords/apex/api/clientes/descuento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telefono: phoneNumber,
          descuento: parseFloat(descuento)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await message.reply(
          `✅ *Descuento actualizado*\n\n` +
          `Nuevo descuento: ${descuento}%\n` +
          `Teléfono: ${phoneNumber}`
        );
      } else {
        await message.reply('❌ Error al actualizar descuento. Verifique que el cliente exista.');
      }
    } catch (error) {
      await message.reply('⚠️ Error al procesar solicitud. Intente nuevamente.');
    }
  }
  
  // Comando: AYUDA
  else if (text === 'AYUDA' || text === 'HELP') {
    await message.reply(
      `🤖 *Comandos disponibles:*\n\n` +
      `📋 CONSULTAR - Ver tu información\n` +
      `💰 DESCUENTO [%] - Actualizar descuento\n` +
      `❓ AYUDA - Ver este mensaje\n\n` +
      `Ejemplo: DESCUENTO 15`
    );
  }
  
  // Mensaje por defecto
  else {
    await message.reply(
      '¡Hola! 👋\n\n' +
      'Envía *AYUDA* para ver los comandos disponibles.'
    );
  }
};

// Rutas API
app.get('/api/status', (req, res) => {
  res.json({
    connected: isReady,
    qrCode: qrCodeData
  });
});

app.post('/api/send-message', async (req, res) => {
  const { phone, message } = req.body;
  
  if (!isReady) {
    return res.status(400).json({ error: 'WhatsApp no está conectado' });
  }
  
  try {
    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    await whatsappClient.sendMessage(chatId, message);
    res.json({ success: true, message: 'Mensaje enviado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar mensaje', details: error.message });
  }
});

app.get('/api/messages', (req, res) => {
  // Aquí podrías implementar lógica para obtener mensajes guardados
  res.json({ messages: [] });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  initWhatsApp();
});

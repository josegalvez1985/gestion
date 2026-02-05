require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const APEX_LOGIN_URL = process.env.APEX_LOGIN_URL || 'https://oracleapex.com/ords/josegalvez/login/auth/login';

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
// Login: Proxy hacia APEX + emisión de JWT
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username y password son obligatorios' });
    }

    console.log('[AUTH] Login request', { username });
    const apexResp = await axios.post(
      APEX_LOGIN_URL,
      { username, password },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 12000,
        validateStatus: (s) => s >= 200 && s < 500
      }
    );
    console.log('[AUTH] APEX response status:', apexResp.status);

    let data = apexResp.data || {};
    console.log('[AUTH] APEX response data type:', typeof data);
    if (typeof data === 'string') {
      console.log('[AUTH] APEX response (string):', data.slice(0, 200));
      try {
        data = JSON.parse(data);
        console.log('[AUTH] Parsed APEX JSON');
      } catch (e) {
        console.warn('[AUTH] Could not parse APEX response as JSON');
      }
    } else {
      console.log('[AUTH] APEX response (object):', JSON.stringify(data).slice(0, 300));
    }

    // Validar solo si success===true
    if (data.success !== true) {
      return res.status(401).json({ success: false, message: data.message || 'Credenciales inválidas' });
    }

    // Alinear datos de usuario
    const user = data.user || { username: data.username || username, nombre: data.nombre || username, rol: data.rol || 'USER' };
    const jwtPayload = { sub: user.id || username, username: user.username || username, rol: user.rol || 'USER' };
    const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log('[AUTH] Issued JWT for', username);
    return res.json({ success: true, message: data.message || 'Login exitoso', token, user });
  } catch (err) {
    console.error('[AUTH] Error:', err.message);
    const status = err.response?.status || 500;
    const message = err.code === 'ECONNABORTED'
      ? 'Tiempo de espera agotado al conectar con APEX'
      : (err.response?.data?.message || err.message || 'Error conectando con APEX');

    return res.status(status === 500 ? 504 : status).json({ success: false, message });
  }
});

// Middleware de protección JWT
const requireAuth = (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }
    const decoded = jwt.verify(parts[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};
app.get('/api/status', (req, res) => {
  res.json({
    connected: isReady,
    qrCode: qrCodeData
  });
});

app.post('/api/send-message', requireAuth, async (req, res) => {
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

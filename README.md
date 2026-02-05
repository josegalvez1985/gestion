# 🔗 WhatsApp + Oracle APEX Manager

Aplicación React con **sistema de autenticación** para gestionar mensajes de WhatsApp Business y actualizar descuentos de clientes en Oracle APEX.

## 🆕 Características de Autenticación

- 🔐 **Login seguro** con hash SHA-256
- 👤 **Registro de usuarios** con validación
- 🔑 **Tokens de sesión** con expiración de 24 horas
- 🚫 **Bloqueo automático** después de 5 intentos fallidos
- 💾 **Persistencia de sesión** en localStorage
- 🛡️ **Roles de usuario** (ADMIN, USER, MANAGER)

## 📋 Características del Sistema

- ✅ Conexión con WhatsApp Business mediante QR
- 📱 Recepción automática de mensajes
- 💰 Actualización de descuentos por WhatsApp
- 🔍 Consulta de información de clientes
- 📤 Envío de mensajes manuales
- 🎨 Interfaz moderna y responsive

## 🚀 Instalación

### Requisitos previos
- Node.js 16+ instalado
- Cuenta de WhatsApp
- Oracle APEX con API REST configurada

### Paso 1: Clonar e instalar dependencias

```bash
cd whatsapp-apex-app
npm install
```

### Paso 2: Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Edita `.env` y actualiza la URL de tu API de APEX:

```
REACT_APP_APEX_API_URL=https://tu-apex-instance.oracle.com/ords/apex/api
```

### Paso 3: Configurar Base de Datos en APEX

#### 3.1 Ejecutar scripts SQL

**En SQL Workshop de APEX, ejecuta en orden:**

1. **`database/autenticacion.sql`** - Sistema de autenticación
   - Crea tabla de usuarios
   - Funciones de hash y tokens
   - Procedimientos de login/registro
   - Usuarios de prueba (admin/usuario)

2. **`database/setup.sql`** - Tablas de clientes
   - Crea tabla de clientes
   - Triggers y procedimientos
   - Datos de ejemplo

#### 3.2 Configurar API REST en APEX

Sigue las guías detalladas en:
- 📖 `docs/APEX_AUTH_API.md` - Endpoints de autenticación
- 📖 `docs/APEX_REST_SETUP.md` - Endpoints de clientes

**Endpoints a crear:**

**Autenticación:**
- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión  
- `POST /auth/validate` - Validar token
- `POST /auth/logout` - Cerrar sesión
- `GET /auth/profile` - Obtener perfil
- `POST /auth/change-password` - Cambiar contraseña

**Clientes:**
- `GET /clientes/:telefono` - Consultar cliente
- `POST /clientes/descuento` - Actualizar descuento
- `GET /clientes` - Listar clientes
- `POST /clientes` - Crear cliente

### Paso 4: Configurar URLs en la aplicación


Edita `server/index.js` y `src/Login.js` para reemplazar:
```javascript
http://tu-apex-url.com/ords/apex/api
```

Con tu URL real de APEX:
```javascript
https://tu-apex-instance.oraclecloudapps.com/ords/workspace/api
```

### Paso 5: Iniciar la aplicación

**Terminal 1 - Servidor Node.js (WhatsApp):**
```bash
npm run server
```

**Terminal 2 - Frontend React:**
```bash
npm start
```

La aplicación estará disponible en: `http://localhost:3000`

### Autenticación

**Primera vez:**
1. Abre `http://localhost:3000`
2. Verás la pantalla de login/registro
3. Puedes:
   - **Iniciar sesión** con credenciales de prueba:
     - Usuario: `admin` / Password: `admin123`
     - Usuario: `usuario` / Password: `user123`
   - **Registrarte** como nuevo usuario

**Sesiones:**
- Las sesiones persisten automáticamente
- Los tokens expiran en 24 horas
- Click en "🚪 Salir" para cerrar sesión

### Conectar WhatsApp

1. Abre la aplicación en el navegador
2. Escanea el código QR con tu WhatsApp
3. Espera a que aparezca "WhatsApp conectado"

### Comandos para clientes vía WhatsApp

Los clientes pueden enviar estos comandos a tu número de WhatsApp:

- **`CONSULTAR`** - Ver información del cliente
- **`DESCUENTO 15`** - Solicitar 15% de descuento (o cualquier %)
- **`AYUDA`** - Ver lista de comandos

### Ejemplo de conversación

```
Cliente: CONSULTAR
Bot: 📋 Información del Cliente
     Nombre: Juan Pérez
     Teléfono: 595981234567
     Descuento actual: 10%
     Estado: ACTIVO

Cliente: DESCUENTO 15
Bot: ✅ Descuento actualizado
     Nuevo descuento: 15%
     Teléfono: 595981234567
```

## 📁 Estructura del proyecto

```
whatsapp-apex-app/
├── server/
│   └── index.js          # Servidor Node.js + WhatsApp
├── src/
│   ├── App.js            # Componente principal React
│   ├── App.css           # Estilos de la app
│   ├── Login.js          # Componente de autenticación
│   ├── Login.css         # Estilos de login
│   ├── index.js          # Punto de entrada
│   └── index.css         # Estilos globales
├── database/
│   ├── autenticacion.sql # Sistema de login/usuarios
│   └── setup.sql         # Tablas de clientes
├── docs/
│   ├── APEX_AUTH_API.md  # Guía API de autenticación
│   ├── APEX_REST_SETUP.md # Guía API de clientes
│   └── GUIA_PRUEBAS_AUTH.md # Pruebas del sistema
├── public/
│   └── index.html        # HTML base
├── package.json          # Dependencias
├── .env.example          # Variables de entorno ejemplo
└── README.md             # Este archivo
```

## 🔧 Configuración avanzada

### Agregar más comandos

Edita `server/index.js` en la función `processMessage()`:

```javascript
else if (text === 'MICOMANDO') {
    // Tu lógica aquí
    await message.reply('Respuesta personalizada');
}
```

### Personalizar mensajes

Los mensajes se pueden personalizar en `server/index.js`:
- Busca las llamadas a `message.reply()`
- Modifica el texto según tu necesidad

### Base de datos local de mensajes

Para guardar historial de mensajes, agrega en `server/index.js`:

```javascript
const messages = [];

whatsappClient.on('message', async (message) => {
    messages.push({
        from: message.from,
        body: message.body,
        timestamp: new Date()
    });
    // ... resto del código
});
```

## ⚠️ Consideraciones importantes

1. **Sesión de WhatsApp**: La sesión se guarda localmente. No cierres la app bruscamente.
2. **Rate Limits**: WhatsApp puede banear si envías muchos mensajes. Usa con moderación.
3. **Seguridad**: No expongas tu servidor directamente a internet sin autenticación.
4. **APEX CORS**: Asegúrate de configurar CORS en APEX para permitir peticiones.

## 🔒 Configurar CORS en APEX

En el módulo REST de APEX, agrega en los headers de respuesta:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type
```

## 🚀 Despliegue en producción

### Opción 1: Heroku

```bash
# Instalar Heroku CLI
heroku create mi-whatsapp-manager
git push heroku main
```

### Opción 2: VPS (Ubuntu)

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clonar proyecto
git clone tu-repo
cd whatsapp-apex-app
npm install
npm run build

# Usar PM2 para mantener la app corriendo
npm install -g pm2
pm2 start server/index.js --name whatsapp-server
pm2 startup
pm2 save
```

## 📞 Soporte

Para problemas o preguntas:
1. Revisa los logs del servidor: `npm run server`
2. Verifica la consola del navegador (F12)
3. Confirma que APEX REST API esté funcionando

## 📝 Licencia

MIT License - Libre para uso personal y comercial.

## 🎉 ¡Listo!

Tu sistema está configurado. Los clientes ahora pueden:
- ✅ Consultar su información
- ✅ Actualizar descuentos
- ✅ Recibir respuestas automáticas

**¡Disfruta tu integración WhatsApp + APEX!** 🚀

# 🧪 Guía de Prueba - Sistema de Autenticación

## 📋 Pasos para probar la autenticación

### 1️⃣ Configurar la Base de Datos

**Ejecuta estos scripts en orden en tu Oracle APEX SQL Workshop:**

1. **Primero:** `database/autenticacion.sql`
   - Crea las tablas de usuarios
   - Crea las funciones de hash y tokens
   - Crea los procedimientos de login/registro
   - Inserta usuarios de prueba

2. **Verificar instalación:**
```sql
-- Ver usuarios creados
SELECT id, username, nombre_completo, rol, estado 
FROM usuarios;

-- Deberías ver:
-- admin / Administrador del Sistema / ADMIN
-- usuario / Usuario de Prueba / USER
```

---

### 2️⃣ Configurar API REST en APEX

**Ve a SQL Workshop → RESTful Services**

Sigue la guía: `docs/APEX_AUTH_API.md`

**Crea estos 6 endpoints:**

1. `POST /auth/register` - Registrar usuarios
2. `POST /auth/login` - Iniciar sesión
3. `POST /auth/validate` - Validar token
4. `POST /auth/logout` - Cerrar sesión
5. `GET /auth/profile` - Obtener perfil
6. `POST /auth/change-password` - Cambiar contraseña

---

### 3️⃣ Probar la API con Postman/cURL

**Obtén tu URL base:**
```
https://apex.oracle.com/pls/apex/[WORKSPACE]/api/
```

O para Oracle Cloud:
```
https://[INSTANCIA].oraclecloudapps.com/ords/[WORKSPACE]/api/
```

#### Prueba 1: Login con usuario admin

```bash
curl -X POST https://TU-URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "A1B2C3D4E5F6789...",
  "user": {
    "id": 1,
    "username": "admin",
    "nombre": "Administrador del Sistema",
    "rol": "ADMIN"
  }
}
```

**💡 Guarda el token** - lo necesitarás para las siguientes pruebas.

---

#### Prueba 2: Validar token

```bash
curl -X POST https://TU-URL/auth/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TU_TOKEN_AQUI"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": 1,
    "username": "admin",
    "nombre": "Administrador del Sistema",
    "email": "admin@empresa.com",
    "rol": "ADMIN"
  }
}
```

---

#### Prueba 3: Registrar nuevo usuario

```bash
curl -X POST https://TU-URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123456",
    "email": "test@example.com",
    "nombre_completo": "Usuario de Prueba"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Usuario registrado correctamente",
  "user_id": 3,
  "username": "testuser"
}
```

---

#### Prueba 4: Login fallido (contraseña incorrecta)

```bash
curl -X POST https://TU-URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "incorrecta"
  }'
```

**Respuesta esperada:**
```json
{
  "success": false,
  "message": "Usuario o contraseña incorrectos"
}
```

---

#### Prueba 5: Obtener perfil (con header Authorization)

```bash
curl -X GET https://TU-URL/auth/profile \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "nombre": "Administrador del Sistema",
    "email": "admin@empresa.com",
    "rol": "ADMIN"
  }
}
```

---

#### Prueba 6: Logout

```bash
curl -X POST https://TU-URL/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TU_TOKEN_AQUI"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Logout exitoso"
}
```

---

### 4️⃣ Configurar la Aplicación React

**Edita el archivo `.env`:**

```env
REACT_APP_APEX_API_URL=https://TU-URL-APEX/ords/workspace/api
```

**O edita directamente en `src/Login.js`:**

Busca esta línea:
```javascript
const APEX_API_URL = process.env.REACT_APP_APEX_API_URL || 'http://tu-apex-url.com/ords/apex/api';
```

Cámbiala por:
```javascript
const APEX_API_URL = 'https://TU-URL-REAL/ords/workspace/api';
```

---

### 5️⃣ Probar la Aplicación React

**Iniciar la aplicación:**

Terminal 1:
```bash
cd whatsapp-apex-app
npm install
npm run server
```

Terminal 2:
```bash
npm start
```

La app se abrirá en `http://localhost:3000`

---

### 6️⃣ Pruebas de la Interfaz

#### Prueba A: Login con usuario existente

1. Abre la app en el navegador
2. Deberías ver la pantalla de login
3. Ingresa:
   - **Usuario:** `admin`
   - **Password:** `admin123`
4. Click en "Iniciar Sesión"
5. ✅ Deberías ver el dashboard principal con el nombre de usuario arriba

---

#### Prueba B: Registro de nuevo usuario

1. Click en la pestaña "Registrarse"
2. Completa el formulario:
   - **Usuario:** `miusuario`
   - **Nombre:** `Mi Nombre`
   - **Email:** `email@test.com`
   - **Contraseña:** `password123`
3. Click en "Registrarse"
4. ✅ Deberías ver un mensaje de éxito
5. La app cambia a la pestaña "Iniciar Sesión"
6. Inicia sesión con el nuevo usuario

---

#### Prueba C: Login con contraseña incorrecta

1. En la pantalla de login, ingresa:
   - **Usuario:** `admin`
   - **Password:** `incorrecta`
2. Click en "Iniciar Sesión"
3. ✅ Deberías ver un mensaje de error: "Usuario o contraseña incorrectos"

---

#### Prueba D: Sesión persistente

1. Inicia sesión con un usuario
2. Cierra el navegador
3. Vuelve a abrir la app
4. ✅ Deberías seguir logueado (la sesión se guarda en localStorage)

---

#### Prueba E: Logout

1. Con un usuario logueado
2. Click en el botón "🚪 Salir" en la esquina superior derecha
3. ✅ Deberías volver a la pantalla de login

---

### 7️⃣ Verificar en la Base de Datos

**Ver tokens de sesión activos:**
```sql
SELECT 
    username,
    nombre_completo,
    token_sesion,
    TO_CHAR(token_expiracion, 'DD/MM/YYYY HH24:MI') as expira,
    TO_CHAR(ultimo_login, 'DD/MM/YYYY HH24:MI') as ultimo_acceso
FROM usuarios
WHERE token_sesion IS NOT NULL;
```

**Ver historial de intentos fallidos:**
```sql
SELECT username, intentos_fallidos, estado
FROM usuarios
ORDER BY intentos_fallidos DESC;
```

**Ver usuarios bloqueados:**
```sql
SELECT username, nombre_completo, intentos_fallidos
FROM usuarios
WHERE estado = 'BLOQUEADO';
```

---

### 8️⃣ Probar Bloqueo por Intentos Fallidos

1. Intenta hacer login 5 veces con contraseña incorrecta
2. En el 5to intento, el usuario se bloquea
3. Intenta hacer login nuevamente
4. ✅ Deberías ver: "Usuario bloqueado. Contacte al administrador"

**Desbloquear manualmente:**
```sql
UPDATE usuarios
SET estado = 'ACTIVO',
    intentos_fallidos = 0
WHERE username = 'admin';
COMMIT;
```

---

### 9️⃣ Probar Expiración de Token

**Los tokens expiran en 24 horas.**

Para probar expiración inmediata:

```sql
-- Expirar token manualmente
UPDATE usuarios
SET token_expiracion = SYSDATE - 1
WHERE username = 'admin';
COMMIT;
```

Ahora intenta usar la app:
- ✅ Deberías ser redirigido al login automáticamente

---

### 🔟 Checklist de Pruebas

- [ ] Script SQL ejecutado correctamente
- [ ] 6 endpoints REST creados en APEX
- [ ] Login con admin funciona
- [ ] Login con contraseña incorrecta falla
- [ ] Registro de nuevo usuario funciona
- [ ] Token se valida correctamente
- [ ] Logout funciona
- [ ] Sesión persiste al recargar página
- [ ] Usuario se bloquea después de 5 intentos
- [ ] Token expira después de 24 horas
- [ ] App React se conecta a APEX correctamente

---

## 🐛 Solución de Problemas

### Error: "Error de conexión. Verifica tu API de APEX"

**Causa:** La URL de APEX no es correcta o CORS no está configurado.

**Solución:**
1. Verifica la URL en `.env` o `Login.js`
2. Agrega headers CORS en APEX (ver `docs/APEX_AUTH_API.md`)
3. Verifica que ORDS esté activo

---

### Error: "Token inválido o expirado"

**Causa:** El token ha expirado (24 horas) o fue borrado.

**Solución:**
1. Cierra sesión y vuelve a iniciar
2. O actualiza la expiración en la base de datos:
```sql
UPDATE usuarios
SET token_expiracion = SYSDATE + 1
WHERE username = 'admin';
COMMIT;
```

---

### Error: "Usuario bloqueado"

**Causa:** 5 intentos fallidos de login.

**Solución:**
```sql
UPDATE usuarios
SET estado = 'ACTIVO',
    intentos_fallidos = 0
WHERE username = 'tu_usuario';
COMMIT;
```

---

### La app muestra login pero no carga el dashboard

**Causa:** Datos de usuario no se guardaron en localStorage.

**Solución:**
1. Abre las DevTools (F12)
2. Ve a Application → Local Storage
3. Verifica que existan:
   - `authToken`
   - `userData`
4. Si no existen, haz login nuevamente

---

## ✅ Sistema Funcionando

Si todas las pruebas pasaron, tu sistema de autenticación está listo:

- ✅ Login seguro con hash SHA-256
- ✅ Tokens de sesión con expiración
- ✅ Bloqueo automático por intentos fallidos
- ✅ Registro de nuevos usuarios
- ✅ Persistencia de sesión
- ✅ API REST completamente funcional

**¡Ahora puedes integrar WhatsApp con usuarios autenticados!** 🚀

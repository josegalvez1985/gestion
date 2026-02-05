# 🔐 Configuración de API de Autenticación en Oracle APEX

## Endpoints a crear en RESTful Services

### 1️⃣ Endpoint: REGISTRO DE USUARIO

**URI Template:** `auth/register`  
**Método:** `POST`

**Handler POST:**
```sql
DECLARE
    v_username VARCHAR2(50) := :username;
    v_password VARCHAR2(100) := :password;
    v_email VARCHAR2(100) := :email;
    v_nombre VARCHAR2(100) := :nombre_completo;
    v_resultado VARCHAR2(50);
    v_mensaje VARCHAR2(200);
    v_user_id NUMBER;
BEGIN
    -- Validar datos obligatorios
    IF v_username IS NULL OR v_password IS NULL THEN
        :status := 400;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Username y password son obligatorios');
        apex_json.close_object;
        RETURN;
    END IF;
    
    -- Llamar al procedimiento de registro
    registrar_usuario(
        p_username => v_username,
        p_password => v_password,
        p_email => v_email,
        p_nombre_completo => v_nombre,
        p_rol => 'USER',
        p_resultado => v_resultado,
        p_mensaje => v_mensaje,
        p_user_id => v_user_id
    );
    
    IF v_resultado = 'EXITO' THEN
        :status := 201;
        apex_json.open_object;
        apex_json.write('success', true);
        apex_json.write('message', v_mensaje);
        apex_json.write('user_id', v_user_id);
        apex_json.write('username', v_username);
        apex_json.close_object;
    ELSE
        :status := 400;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', v_mensaje);
        apex_json.close_object;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        :status := 500;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Error del servidor: ' || SQLERRM);
        apex_json.close_object;
END;
```

**Body JSON esperado:**
```json
{
  "username": "juanperez",
  "password": "mipassword123",
  "email": "juan@example.com",
  "nombre_completo": "Juan Pérez"
}
```

---

### 2️⃣ Endpoint: LOGIN

**URI Template:** `auth/login`  
**Método:** `POST`

**Handler POST:**
```sql
DECLARE
    v_username VARCHAR2(50) := :username;
    v_password VARCHAR2(100) := :password;
    v_resultado VARCHAR2(50);
    v_mensaje VARCHAR2(200);
    v_token VARCHAR2(200);
    v_user_id NUMBER;
    v_nombre VARCHAR2(100);
    v_rol VARCHAR2(20);
BEGIN
    -- Validar datos obligatorios
    IF v_username IS NULL OR v_password IS NULL THEN
        :status := 400;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Username y password son obligatorios');
        apex_json.close_object;
        RETURN;
    END IF;
    
    -- Llamar al procedimiento de login
    login_usuario(
        p_username => v_username,
        p_password => v_password,
        p_resultado => v_resultado,
        p_mensaje => v_mensaje,
        p_token => v_token,
        p_user_id => v_user_id,
        p_nombre => v_nombre,
        p_rol => v_rol
    );
    
    IF v_resultado = 'EXITO' THEN
        :status := 200;
        apex_json.open_object;
        apex_json.write('success', true);
        apex_json.write('message', v_mensaje);
        apex_json.write('token', v_token);
        apex_json.write('user', apex_json.object_t(
            'id', v_user_id,
            'username', v_username,
            'nombre', v_nombre,
            'rol', v_rol
        ));
        apex_json.close_object;
    ELSE
        :status := 401;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', v_mensaje);
        apex_json.close_object;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        :status := 500;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Error del servidor: ' || SQLERRM);
        apex_json.close_object;
END;
```

**Body JSON esperado:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "A1B2C3D4E5F6...",
  "user": {
    "id": 1,
    "username": "admin",
    "nombre": "Administrador del Sistema",
    "rol": "ADMIN"
  }
}
```

---

### 3️⃣ Endpoint: VALIDAR TOKEN (Verificar sesión)

**URI Template:** `auth/validate`  
**Método:** `POST`

**Handler POST:**
```sql
DECLARE
    v_token VARCHAR2(200) := :token;
    v_resultado VARCHAR2(50);
    v_user_id NUMBER;
    v_username VARCHAR2(50);
    v_nombre VARCHAR2(100);
    v_email VARCHAR2(100);
    v_rol VARCHAR2(20);
BEGIN
    IF v_token IS NULL THEN
        :status := 400;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Token es obligatorio');
        apex_json.close_object;
        RETURN;
    END IF;
    
    -- Obtener info del usuario por token
    get_user_by_token(
        p_token => v_token,
        p_resultado => v_resultado,
        p_user_id => v_user_id,
        p_username => v_username,
        p_nombre => v_nombre,
        p_email => v_email,
        p_rol => v_rol
    );
    
    IF v_resultado = 'EXITO' THEN
        :status := 200;
        apex_json.open_object;
        apex_json.write('success', true);
        apex_json.write('valid', true);
        apex_json.write('user', apex_json.object_t(
            'id', v_user_id,
            'username', v_username,
            'nombre', v_nombre,
            'email', v_email,
            'rol', v_rol
        ));
        apex_json.close_object;
    ELSE
        :status := 401;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('valid', false);
        apex_json.write('message', 'Token inválido o expirado');
        apex_json.close_object;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        :status := 500;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Error: ' || SQLERRM);
        apex_json.close_object;
END;
```

**Body JSON esperado:**
```json
{
  "token": "A1B2C3D4E5F6..."
}
```

---

### 4️⃣ Endpoint: LOGOUT

**URI Template:** `auth/logout`  
**Método:** `POST`

**Handler POST:**
```sql
DECLARE
    v_token VARCHAR2(200) := :token;
    v_resultado VARCHAR2(50);
    v_mensaje VARCHAR2(200);
BEGIN
    IF v_token IS NULL THEN
        :status := 400;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Token es obligatorio');
        apex_json.close_object;
        RETURN;
    END IF;
    
    logout_usuario(
        p_token => v_token,
        p_resultado => v_resultado,
        p_mensaje => v_mensaje
    );
    
    IF v_resultado = 'EXITO' THEN
        :status := 200;
        apex_json.open_object;
        apex_json.write('success', true);
        apex_json.write('message', v_mensaje);
        apex_json.close_object;
    ELSE
        :status := 400;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', v_mensaje);
        apex_json.close_object;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        :status := 500;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Error: ' || SQLERRM);
        apex_json.close_object;
END;
```

---

### 5️⃣ Endpoint: OBTENER PERFIL (requiere token)

**URI Template:** `auth/profile`  
**Método:** `GET`

**Handler GET:**
```sql
DECLARE
    v_token VARCHAR2(200);
    v_resultado VARCHAR2(50);
    v_user_id NUMBER;
    v_username VARCHAR2(50);
    v_nombre VARCHAR2(100);
    v_email VARCHAR2(100);
    v_rol VARCHAR2(20);
BEGIN
    -- Obtener token del header Authorization
    v_token := OWA_UTIL.GET_CGI_ENV('HTTP_AUTHORIZATION');
    
    -- Remover "Bearer " del inicio si existe
    IF v_token LIKE 'Bearer %' THEN
        v_token := SUBSTR(v_token, 8);
    END IF;
    
    IF v_token IS NULL THEN
        :status := 401;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Token no proporcionado');
        apex_json.close_object;
        RETURN;
    END IF;
    
    get_user_by_token(
        p_token => v_token,
        p_resultado => v_resultado,
        p_user_id => v_user_id,
        p_username => v_username,
        p_nombre => v_nombre,
        p_email => v_email,
        p_rol => v_rol
    );
    
    IF v_resultado = 'EXITO' THEN
        :status := 200;
        apex_json.open_object;
        apex_json.write('success', true);
        apex_json.write('user', apex_json.object_t(
            'id', v_user_id,
            'username', v_username,
            'nombre', v_nombre,
            'email', v_email,
            'rol', v_rol
        ));
        apex_json.close_object;
    ELSE
        :status := 401;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Token inválido');
        apex_json.close_object;
    END IF;
END;
```

---

### 6️⃣ Endpoint: CAMBIAR CONTRASEÑA

**URI Template:** `auth/change-password`  
**Método:** `POST`

**Handler POST:**
```sql
DECLARE
    v_token VARCHAR2(200) := :token;
    v_old_password VARCHAR2(100) := :old_password;
    v_new_password VARCHAR2(100) := :new_password;
    v_resultado VARCHAR2(50);
    v_mensaje VARCHAR2(200);
    v_user_id NUMBER;
    v_username VARCHAR2(50);
    v_nombre VARCHAR2(100);
    v_email VARCHAR2(100);
    v_rol VARCHAR2(20);
BEGIN
    -- Validar token
    get_user_by_token(
        p_token => v_token,
        p_resultado => v_resultado,
        p_user_id => v_user_id,
        p_username => v_username,
        p_nombre => v_nombre,
        p_email => v_email,
        p_rol => v_rol
    );
    
    IF v_resultado != 'EXITO' THEN
        :status := 401;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Token inválido');
        apex_json.close_object;
        RETURN;
    END IF;
    
    -- Cambiar contraseña
    cambiar_password(
        p_user_id => v_user_id,
        p_old_password => v_old_password,
        p_new_password => v_new_password,
        p_resultado => v_resultado,
        p_mensaje => v_mensaje
    );
    
    IF v_resultado = 'EXITO' THEN
        :status := 200;
        apex_json.open_object;
        apex_json.write('success', true);
        apex_json.write('message', v_mensaje);
        apex_json.close_object;
    ELSE
        :status := 400;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', v_mensaje);
        apex_json.close_object;
    END IF;
END;
```

---

## 📋 Resumen de Endpoints

| Método | Endpoint | Descripción | Requiere Auth |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Registrar nuevo usuario | No |
| POST | `/auth/login` | Iniciar sesión | No |
| POST | `/auth/validate` | Validar token | No |
| POST | `/auth/logout` | Cerrar sesión | Sí (token) |
| GET | `/auth/profile` | Obtener perfil | Sí (header) |
| POST | `/auth/change-password` | Cambiar contraseña | Sí (token) |

---

## 🧪 Pruebas con cURL

### Registro:
```bash
curl -X POST https://tu-apex-url/ords/workspace/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123456",
    "email": "test@example.com",
    "nombre_completo": "Usuario de Prueba"
  }'
```

### Login:
```bash
curl -X POST https://tu-apex-url/ords/workspace/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### Validar token:
```bash
curl -X POST https://tu-apex-url/ords/workspace/api/auth/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TU_TOKEN_AQUI"
  }'
```

### Obtener perfil (con header):
```bash
curl -X GET https://tu-apex-url/ords/workspace/api/auth/profile \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## 🔒 Configurar CORS

En cada endpoint, agrega estos headers de respuesta:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 3600
```

---

## ✅ Usuarios por defecto

Después de ejecutar el script SQL, tendrás estos usuarios:

| Username | Password | Rol |
|----------|----------|-----|
| admin | admin123 | ADMIN |
| usuario | user123 | USER |

---

## 🔐 Seguridad

1. **Tokens expiran en 24 horas**
2. **Después de 5 intentos fallidos, la cuenta se bloquea**
3. **Contraseñas hasheadas con SHA-256**
4. **Tokens únicos por sesión**

---

¡API de autenticación lista! 🚀

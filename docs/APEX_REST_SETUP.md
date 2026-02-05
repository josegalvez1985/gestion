# Guía de Configuración de REST API en Oracle APEX

## 📋 Paso a paso para configurar la API REST

### 1️⃣ Acceder a RESTful Services

1. Inicia sesión en tu Oracle APEX
2. Ve a **SQL Workshop**
3. Selecciona **RESTful Services**

### 2️⃣ Crear Módulo REST

**Configuración del Módulo:**
- **Module Name**: `api`
- **URI Prefix**: `api`
- **Origins Allowed**: `*` (para desarrollo) o tu dominio específico
- **Parse Request**: `Yes`

Haz clic en **Create Module**

### 3️⃣ Crear Templates (Endpoints)

#### 📌 Endpoint 1: Consultar Cliente

**URI Template:** `clientes/:telefono`

**Handler GET:**
```sql
BEGIN
    -- Obtener información del cliente
    FOR c IN (
        SELECT 
            nombre,
            telefono,
            email,
            descuento,
            estado,
            TO_CHAR(fecha_creacion, 'DD/MM/YYYY') as fecha_creacion,
            TO_CHAR(ultima_compra, 'DD/MM/YYYY') as ultima_compra,
            total_compras
        FROM clientes
        WHERE telefono = :telefono
        AND estado = 'ACTIVO'
    ) LOOP
        -- Retornar JSON
        apex_json.open_object;
        apex_json.write('success', true);
        apex_json.write('nombre', c.nombre);
        apex_json.write('telefono', c.telefono);
        apex_json.write('email', c.email);
        apex_json.write('descuento', c.descuento);
        apex_json.write('estado', c.estado);
        apex_json.write('fecha_creacion', c.fecha_creacion);
        apex_json.write('ultima_compra', c.ultima_compra);
        apex_json.write('total_compras', c.total_compras);
        apex_json.close_object;
        RETURN;
    END LOOP;
    
    -- Si no se encuentra el cliente
    :status := 404;
    apex_json.open_object;
    apex_json.write('success', false);
    apex_json.write('message', 'Cliente no encontrado');
    apex_json.close_object;
END;
```

**Parámetros:**
- `telefono` (Tipo: STRING, Required: Yes)

---

#### 📌 Endpoint 2: Actualizar Descuento

**URI Template:** `clientes/descuento`

**Handler POST:**
```sql
DECLARE
    v_telefono VARCHAR2(20);
    v_descuento NUMBER;
    v_count NUMBER;
    v_cliente_id NUMBER;
    v_nombre VARCHAR2(100);
BEGIN
    -- Leer parámetros del body JSON
    v_telefono := :telefono;
    v_descuento := :descuento;
    
    -- Validar descuento
    IF v_descuento < 0 OR v_descuento > 100 THEN
        :status := 400;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'El descuento debe estar entre 0 y 100');
        apex_json.close_object;
        RETURN;
    END IF;
    
    -- Verificar si existe el cliente
    BEGIN
        SELECT id, nombre 
        INTO v_cliente_id, v_nombre
        FROM clientes
        WHERE telefono = v_telefono
        AND estado = 'ACTIVO';
        
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            :status := 404;
            apex_json.open_object;
            apex_json.write('success', false);
            apex_json.write('message', 'Cliente no encontrado o inactivo');
            apex_json.close_object;
            RETURN;
    END;
    
    -- Actualizar descuento
    UPDATE clientes
    SET descuento = v_descuento,
        fecha_modificacion = SYSDATE
    WHERE id = v_cliente_id;
    
    COMMIT;
    
    -- Retornar éxito
    :status := 200;
    apex_json.open_object;
    apex_json.write('success', true);
    apex_json.write('message', 'Descuento actualizado correctamente');
    apex_json.write('cliente', v_nombre);
    apex_json.write('telefono', v_telefono);
    apex_json.write('descuento', v_descuento);
    apex_json.close_object;
    
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        :status := 500;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Error al actualizar: ' || SQLERRM);
        apex_json.close_object;
END;
```

**Parámetros (Body JSON):**
```json
{
  "telefono": "595981234567",
  "descuento": 15
}
```

---

#### 📌 Endpoint 3: Listar Clientes (Opcional)

**URI Template:** `clientes`

**Handler GET:**
```sql
BEGIN
    apex_json.open_object;
    apex_json.write('success', true);
    apex_json.open_array('clientes');
    
    FOR c IN (
        SELECT 
            id,
            nombre,
            telefono,
            email,
            descuento,
            estado,
            TO_CHAR(fecha_creacion, 'DD/MM/YYYY') as fecha_creacion
        FROM clientes
        WHERE estado = 'ACTIVO'
        ORDER BY nombre
    ) LOOP
        apex_json.open_object;
        apex_json.write('id', c.id);
        apex_json.write('nombre', c.nombre);
        apex_json.write('telefono', c.telefono);
        apex_json.write('email', c.email);
        apex_json.write('descuento', c.descuento);
        apex_json.write('fecha_creacion', c.fecha_creacion);
        apex_json.close_object;
    END LOOP;
    
    apex_json.close_array;
    apex_json.close_object;
END;
```

---

#### 📌 Endpoint 4: Crear Cliente (Opcional)

**URI Template:** `clientes`

**Handler POST:**
```sql
DECLARE
    v_nombre VARCHAR2(100) := :nombre;
    v_telefono VARCHAR2(20) := :telefono;
    v_email VARCHAR2(100) := :email;
    v_descuento NUMBER := NVL(:descuento, 0);
    v_cliente_id NUMBER;
BEGIN
    -- Validar datos requeridos
    IF v_nombre IS NULL OR v_telefono IS NULL THEN
        :status := 400;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Nombre y teléfono son obligatorios');
        apex_json.close_object;
        RETURN;
    END IF;
    
    -- Insertar cliente
    INSERT INTO clientes (nombre, telefono, email, descuento, estado)
    VALUES (v_nombre, v_telefono, v_email, v_descuento, 'ACTIVO')
    RETURNING id INTO v_cliente_id;
    
    COMMIT;
    
    -- Retornar éxito
    :status := 201;
    apex_json.open_object;
    apex_json.write('success', true);
    apex_json.write('message', 'Cliente creado correctamente');
    apex_json.write('id', v_cliente_id);
    apex_json.write('nombre', v_nombre);
    apex_json.write('telefono', v_telefono);
    apex_json.close_object;
    
EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
        ROLLBACK;
        :status := 409;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Ya existe un cliente con ese teléfono');
        apex_json.close_object;
    WHEN OTHERS THEN
        ROLLBACK;
        :status := 500;
        apex_json.open_object;
        apex_json.write('success', false);
        apex_json.write('message', 'Error: ' || SQLERRM);
        apex_json.close_object;
END;
```

---

### 4️⃣ Configurar CORS

En cada Template, ve a la pestaña **Parameters** y agrega estos headers de respuesta:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 5️⃣ Probar la API

#### Obtener la URL base

Tu URL será algo como:
```
https://apex.oracle.com/pls/apex/[workspace]/api/
```

O en Oracle Cloud:
```
https://[tu-instancia].oraclecloudapps.com/ords/[workspace]/api/
```

#### Probar con cURL

**Consultar cliente:**
```bash
curl https://tu-apex-url/api/clientes/595981234567
```

**Actualizar descuento:**
```bash
curl -X POST https://tu-apex-url/api/clientes/descuento \
  -H "Content-Type: application/json" \
  -d '{"telefono":"595981234567","descuento":20}'
```

**Listar clientes:**
```bash
curl https://tu-apex-url/api/clientes
```

### 6️⃣ Actualizar la aplicación React

Una vez que tengas la URL de tu API, actualiza estos archivos:

**En `server/index.js`**, reemplaza:
```javascript
http://tu-apex-url.com/ords/apex/api
```

Con tu URL real:
```javascript
https://tu-apex-url.oraclecloudapps.com/ords/workspace/api
```

**En `src/App.js`**, haz lo mismo.

### 7️⃣ Seguridad (Producción)

Para producción, considera:

1. **Autenticación OAuth2**
   - Configura OAuth en APEX
   - Requiere token en cada petición

2. **Rate Limiting**
   - Limita peticiones por IP
   - APEX lo soporta nativamente

3. **HTTPS obligatorio**
   - Siempre usa HTTPS en producción

4. **CORS específico**
   - Cambia `*` por tu dominio exacto

5. **Validación de datos**
   - Valida todos los inputs
   - Sanitiza strings

## ✅ Checklist Final

- [ ] Módulo REST creado
- [ ] 4 endpoints configurados
- [ ] CORS habilitado
- [ ] Base de datos con datos de prueba
- [ ] API probada con cURL o Postman
- [ ] URLs actualizadas en la app React
- [ ] Seguridad configurada (producción)

## 📞 Soporte

Si tienes errores:
1. Verifica los logs en APEX (Monitor → Dashboard)
2. Revisa que la tabla `clientes` exista
3. Confirma que ORDS esté activo
4. Prueba con Postman antes de conectar la app

¡Listo! Tu API REST está configurada y lista para usar. 🚀

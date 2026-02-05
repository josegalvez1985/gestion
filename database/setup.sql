-- ================================================
-- Script SQL para Oracle APEX
-- Sistema de gestión de clientes con WhatsApp
-- ================================================

-- 1. CREAR TABLA DE CLIENTES
-- ================================================
CREATE TABLE clientes (
    id NUMBER PRIMARY KEY,
    nombre VARCHAR2(100) NOT NULL,
    telefono VARCHAR2(20) UNIQUE NOT NULL,
    email VARCHAR2(100),
    descuento NUMBER(5,2) DEFAULT 0 CHECK (descuento >= 0 AND descuento <= 100),
    estado VARCHAR2(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO', 'SUSPENDIDO')),
    fecha_creacion DATE DEFAULT SYSDATE,
    fecha_modificacion DATE,
    ultima_compra DATE,
    total_compras NUMBER(10,2) DEFAULT 0,
    notas CLOB
);

-- 2. CREAR SECUENCIA PARA IDs
-- ================================================
CREATE SEQUENCE clientes_seq 
START WITH 1 
INCREMENT BY 1 
NOCACHE 
NOCYCLE;

-- 3. CREAR TRIGGER PARA AUTO-INCREMENTO
-- ================================================
CREATE OR REPLACE TRIGGER clientes_bir
BEFORE INSERT ON clientes
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT clientes_seq.NEXTVAL INTO :NEW.id FROM dual;
    END IF;
    :NEW.fecha_creacion := SYSDATE;
END;
/

-- 4. CREAR TABLA DE HISTORIAL DE DESCUENTOS
-- ================================================
CREATE TABLE historial_descuentos (
    id NUMBER PRIMARY KEY,
    cliente_id NUMBER NOT NULL,
    descuento_anterior NUMBER(5,2),
    descuento_nuevo NUMBER(5,2),
    fecha_cambio DATE DEFAULT SYSDATE,
    origen VARCHAR2(50), -- 'WHATSAPP', 'MANUAL', 'SISTEMA'
    usuario VARCHAR2(100),
    CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE SEQUENCE historial_desc_seq START WITH 1;

-- 5. TRIGGER PARA REGISTRAR CAMBIOS DE DESCUENTO
-- ================================================
CREATE OR REPLACE TRIGGER clientes_descuento_trg
BEFORE UPDATE OF descuento ON clientes
FOR EACH ROW
BEGIN
    IF :OLD.descuento != :NEW.descuento THEN
        INSERT INTO historial_descuentos (
            id, cliente_id, descuento_anterior, descuento_nuevo, origen, usuario
        ) VALUES (
            historial_desc_seq.NEXTVAL,
            :NEW.id,
            :OLD.descuento,
            :NEW.descuento,
            'WHATSAPP',
            USER
        );
        
        :NEW.fecha_modificacion := SYSDATE;
    END IF;
END;
/

-- 6. CREAR TABLA DE MENSAJES WHATSAPP (opcional)
-- ================================================
CREATE TABLE mensajes_whatsapp (
    id NUMBER PRIMARY KEY,
    telefono VARCHAR2(20) NOT NULL,
    mensaje CLOB,
    direccion VARCHAR2(10) CHECK (direccion IN ('ENVIADO', 'RECIBIDO')),
    fecha_mensaje DATE DEFAULT SYSDATE,
    procesado VARCHAR2(1) DEFAULT 'N' CHECK (procesado IN ('S', 'N')),
    respuesta CLOB
);

CREATE SEQUENCE mensajes_seq START WITH 1;

-- 7. INSERTAR DATOS DE EJEMPLO
-- ================================================
INSERT INTO clientes (nombre, telefono, email, descuento, estado)
VALUES ('Juan Pérez', '595981234567', 'juan@example.com', 10, 'ACTIVO');

INSERT INTO clientes (nombre, telefono, email, descuento, estado)
VALUES ('María González', '595982345678', 'maria@example.com', 15, 'ACTIVO');

INSERT INTO clientes (nombre, telefono, email, descuento, estado)
VALUES ('Carlos López', '595983456789', 'carlos@example.com', 5, 'ACTIVO');

COMMIT;

-- 8. VISTA PARA CONSULTAS RÁPIDAS
-- ================================================
CREATE OR REPLACE VIEW v_clientes_activos AS
SELECT 
    id,
    nombre,
    telefono,
    email,
    descuento,
    estado,
    TO_CHAR(fecha_creacion, 'DD/MM/YYYY') as fecha_alta,
    TO_CHAR(ultima_compra, 'DD/MM/YYYY') as ultima_compra_fmt,
    total_compras
FROM clientes
WHERE estado = 'ACTIVO'
ORDER BY nombre;

-- 9. FUNCIÓN PARA VALIDAR TELÉFONO
-- ================================================
CREATE OR REPLACE FUNCTION validar_telefono(p_telefono VARCHAR2)
RETURN VARCHAR2
IS
    v_telefono VARCHAR2(20);
BEGIN
    -- Limpiar caracteres especiales
    v_telefono := REGEXP_REPLACE(p_telefono, '[^0-9]', '');
    
    -- Validar longitud (Paraguay: 12 dígitos con código país)
    IF LENGTH(v_telefono) < 10 THEN
        RETURN NULL;
    END IF;
    
    -- Agregar código de país si no existe
    IF SUBSTR(v_telefono, 1, 3) != '595' THEN
        v_telefono := '595' || v_telefono;
    END IF;
    
    RETURN v_telefono;
END;
/

-- 10. PROCEDIMIENTO PARA ACTUALIZAR DESCUENTO
-- ================================================
CREATE OR REPLACE PROCEDURE actualizar_descuento(
    p_telefono IN VARCHAR2,
    p_descuento IN NUMBER,
    p_resultado OUT VARCHAR2,
    p_mensaje OUT VARCHAR2
)
IS
    v_count NUMBER;
    v_telefono_limpio VARCHAR2(20);
BEGIN
    -- Validar y limpiar teléfono
    v_telefono_limpio := validar_telefono(p_telefono);
    
    IF v_telefono_limpio IS NULL THEN
        p_resultado := 'ERROR';
        p_mensaje := 'Número de teléfono inválido';
        RETURN;
    END IF;
    
    -- Validar descuento
    IF p_descuento < 0 OR p_descuento > 100 THEN
        p_resultado := 'ERROR';
        p_mensaje := 'El descuento debe estar entre 0 y 100';
        RETURN;
    END IF;
    
    -- Verificar si existe el cliente
    SELECT COUNT(*) INTO v_count
    FROM clientes
    WHERE telefono = v_telefono_limpio;
    
    IF v_count = 0 THEN
        p_resultado := 'ERROR';
        p_mensaje := 'Cliente no encontrado';
        RETURN;
    END IF;
    
    -- Actualizar descuento
    UPDATE clientes
    SET descuento = p_descuento,
        fecha_modificacion = SYSDATE
    WHERE telefono = v_telefono_limpio
    AND estado = 'ACTIVO';
    
    IF SQL%ROWCOUNT > 0 THEN
        COMMIT;
        p_resultado := 'EXITO';
        p_mensaje := 'Descuento actualizado correctamente';
    ELSE
        p_resultado := 'ERROR';
        p_mensaje := 'No se pudo actualizar (cliente inactivo)';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        p_resultado := 'ERROR';
        p_mensaje := 'Error: ' || SQLERRM;
END;
/

-- 11. FUNCIÓN PARA OBTENER INFO DEL CLIENTE
-- ================================================
CREATE OR REPLACE FUNCTION get_cliente_info(p_telefono VARCHAR2)
RETURN CLOB
IS
    v_json CLOB;
    v_telefono VARCHAR2(20);
    v_count NUMBER;
BEGIN
    v_telefono := validar_telefono(p_telefono);
    
    SELECT COUNT(*) INTO v_count
    FROM clientes
    WHERE telefono = v_telefono;
    
    IF v_count = 0 THEN
        RETURN '{"success": false, "message": "Cliente no encontrado"}';
    END IF;
    
    SELECT JSON_OBJECT(
        'success' VALUE 'true',
        'nombre' VALUE nombre,
        'telefono' VALUE telefono,
        'email' VALUE email,
        'descuento' VALUE descuento,
        'estado' VALUE estado,
        'fecha_creacion' VALUE TO_CHAR(fecha_creacion, 'DD/MM/YYYY'),
        'total_compras' VALUE total_compras
    )
    INTO v_json
    FROM clientes
    WHERE telefono = v_telefono;
    
    RETURN v_json;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN '{"success": false, "message": "Error al consultar datos"}';
END;
/

-- 12. ÍNDICES PARA MEJORAR RENDIMIENTO
-- ================================================
CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_mensajes_fecha ON mensajes_whatsapp(fecha_mensaje);

-- 13. GRANT PERMISOS (ajustar según tu usuario APEX)
-- ================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON clientes TO apex_usuario;
-- GRANT SELECT, INSERT ON mensajes_whatsapp TO apex_usuario;
-- GRANT SELECT ON v_clientes_activos TO apex_usuario;
-- GRANT EXECUTE ON actualizar_descuento TO apex_usuario;
-- GRANT EXECUTE ON get_cliente_info TO apex_usuario;

-- ================================================
-- FIN DEL SCRIPT
-- ================================================

-- VERIFICAR INSTALACIÓN
SELECT 'Clientes registrados: ' || COUNT(*) as resultado FROM clientes;
SELECT 'Tablas creadas correctamente' as resultado FROM dual;

-- ================================================
-- Sistema de Autenticación para Oracle APEX
-- ================================================

-- 1. CREAR TABLA DE USUARIOS
-- ================================================
CREATE TABLE usuarios (
    id NUMBER PRIMARY KEY,
    username VARCHAR2(50) UNIQUE NOT NULL,
    password_hash VARCHAR2(200) NOT NULL,
    email VARCHAR2(100),
    nombre_completo VARCHAR2(100),
    rol VARCHAR2(20) DEFAULT 'USER' CHECK (rol IN ('ADMIN', 'USER', 'MANAGER')),
    estado VARCHAR2(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO', 'BLOQUEADO')),
    intentos_fallidos NUMBER DEFAULT 0,
    ultimo_login DATE,
    fecha_creacion DATE DEFAULT SYSDATE,
    fecha_modificacion DATE,
    token_sesion VARCHAR2(200),
    token_expiracion DATE
);

-- 2. CREAR SECUENCIA
-- ================================================
CREATE SEQUENCE usuarios_seq START WITH 1 INCREMENT BY 1;

-- 3. TRIGGER PARA AUTO-INCREMENTO
-- ================================================
CREATE OR REPLACE TRIGGER usuarios_bir
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT usuarios_seq.NEXTVAL INTO :NEW.id FROM dual;
    END IF;
    :NEW.fecha_creacion := SYSDATE;
END;
/

-- 4. FUNCIÓN PARA HASH DE CONTRASEÑA (SHA-256)
-- ================================================
CREATE OR REPLACE FUNCTION hash_password(p_password VARCHAR2)
RETURN VARCHAR2
IS
    v_hash RAW(2000);
BEGIN
    v_hash := DBMS_CRYPTO.HASH(
        UTL_RAW.CAST_TO_RAW(p_password),
        DBMS_CRYPTO.HASH_SH256
    );
    RETURN RAWTOHEX(v_hash);
END;
/

-- 5. FUNCIÓN PARA GENERAR TOKEN DE SESIÓN
-- ================================================
CREATE OR REPLACE FUNCTION generar_token
RETURN VARCHAR2
IS
    v_random RAW(16);
    v_token VARCHAR2(200);
BEGIN
    v_random := DBMS_CRYPTO.RANDOMBYTES(16);
    v_token := RAWTOHEX(v_random) || TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS');
    RETURN v_token;
END;
/

-- 6. PROCEDIMIENTO PARA REGISTRAR USUARIO
-- ================================================
CREATE OR REPLACE PROCEDURE registrar_usuario(
    p_username IN VARCHAR2,
    p_password IN VARCHAR2,
    p_email IN VARCHAR2,
    p_nombre_completo IN VARCHAR2,
    p_rol IN VARCHAR2 DEFAULT 'USER',
    p_resultado OUT VARCHAR2,
    p_mensaje OUT VARCHAR2,
    p_user_id OUT NUMBER
)
IS
    v_password_hash VARCHAR2(200);
    v_count NUMBER;
BEGIN
    -- Validar que el username no exista
    SELECT COUNT(*) INTO v_count
    FROM usuarios
    WHERE UPPER(username) = UPPER(p_username);
    
    IF v_count > 0 THEN
        p_resultado := 'ERROR';
        p_mensaje := 'El nombre de usuario ya existe';
        p_user_id := NULL;
        RETURN;
    END IF;
    
    -- Validar longitud de contraseña
    IF LENGTH(p_password) < 6 THEN
        p_resultado := 'ERROR';
        p_mensaje := 'La contraseña debe tener al menos 6 caracteres';
        p_user_id := NULL;
        RETURN;
    END IF;
    
    -- Generar hash de la contraseña
    v_password_hash := hash_password(p_password);
    
    -- Insertar usuario
    INSERT INTO usuarios (
        username,
        password_hash,
        email,
        nombre_completo,
        rol,
        estado
    ) VALUES (
        LOWER(p_username),
        v_password_hash,
        p_email,
        p_nombre_completo,
        p_rol,
        'ACTIVO'
    ) RETURNING id INTO p_user_id;
    
    COMMIT;
    
    p_resultado := 'EXITO';
    p_mensaje := 'Usuario registrado correctamente';
    
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        p_resultado := 'ERROR';
        p_mensaje := 'Error al registrar: ' || SQLERRM;
        p_user_id := NULL;
END;
/

-- 7. PROCEDIMIENTO PARA LOGIN
-- ================================================
CREATE OR REPLACE PROCEDURE login_usuario(
    p_username IN VARCHAR2,
    p_password IN VARCHAR2,
    p_resultado OUT VARCHAR2,
    p_mensaje OUT VARCHAR2,
    p_token OUT VARCHAR2,
    p_user_id OUT NUMBER,
    p_nombre OUT VARCHAR2,
    p_rol OUT VARCHAR2
)
IS
    v_password_hash VARCHAR2(200);
    v_stored_hash VARCHAR2(200);
    v_estado VARCHAR2(20);
    v_intentos NUMBER;
    v_token VARCHAR2(200);
BEGIN
    -- Generar hash de la contraseña ingresada
    v_password_hash := hash_password(p_password);
    
    -- Buscar usuario
    BEGIN
        SELECT 
            id,
            password_hash,
            estado,
            intentos_fallidos,
            nombre_completo,
            rol
        INTO 
            p_user_id,
            v_stored_hash,
            v_estado,
            v_intentos,
            p_nombre,
            p_rol
        FROM usuarios
        WHERE UPPER(username) = UPPER(p_username);
        
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            p_resultado := 'ERROR';
            p_mensaje := 'Usuario o contraseña incorrectos';
            p_token := NULL;
            p_user_id := NULL;
            RETURN;
    END;
    
    -- Verificar si está bloqueado
    IF v_estado = 'BLOQUEADO' THEN
        p_resultado := 'ERROR';
        p_mensaje := 'Usuario bloqueado. Contacte al administrador';
        p_token := NULL;
        RETURN;
    END IF;
    
    -- Verificar contraseña
    IF v_password_hash != v_stored_hash THEN
        -- Incrementar intentos fallidos
        UPDATE usuarios
        SET intentos_fallidos = intentos_fallidos + 1,
            estado = CASE WHEN intentos_fallidos + 1 >= 5 THEN 'BLOQUEADO' ELSE estado END
        WHERE id = p_user_id;
        COMMIT;
        
        p_resultado := 'ERROR';
        p_mensaje := 'Usuario o contraseña incorrectos';
        p_token := NULL;
        p_user_id := NULL;
        RETURN;
    END IF;
    
    -- Login exitoso - generar token
    v_token := generar_token();
    
    UPDATE usuarios
    SET token_sesion = v_token,
        token_expiracion = SYSDATE + 1, -- Token válido por 24 horas
        ultimo_login = SYSDATE,
        intentos_fallidos = 0,
        estado = 'ACTIVO'
    WHERE id = p_user_id;
    
    COMMIT;
    
    p_resultado := 'EXITO';
    p_mensaje := 'Login exitoso';
    p_token := v_token;
    
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        p_resultado := 'ERROR';
        p_mensaje := 'Error en el sistema: ' || SQLERRM;
        p_token := NULL;
END;
/

-- 8. FUNCIÓN PARA VALIDAR TOKEN
-- ================================================
CREATE OR REPLACE FUNCTION validar_token(p_token VARCHAR2)
RETURN BOOLEAN
IS
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM usuarios
    WHERE token_sesion = p_token
    AND token_expiracion > SYSDATE
    AND estado = 'ACTIVO';
    
    RETURN v_count > 0;
END;
/

-- 9. PROCEDIMIENTO PARA OBTENER INFO DEL USUARIO POR TOKEN
-- ================================================
CREATE OR REPLACE PROCEDURE get_user_by_token(
    p_token IN VARCHAR2,
    p_resultado OUT VARCHAR2,
    p_user_id OUT NUMBER,
    p_username OUT VARCHAR2,
    p_nombre OUT VARCHAR2,
    p_email OUT VARCHAR2,
    p_rol OUT VARCHAR2
)
IS
BEGIN
    SELECT 
        id,
        username,
        nombre_completo,
        email,
        rol
    INTO 
        p_user_id,
        p_username,
        p_nombre,
        p_email,
        p_rol
    FROM usuarios
    WHERE token_sesion = p_token
    AND token_expiracion > SYSDATE
    AND estado = 'ACTIVO';
    
    p_resultado := 'EXITO';
    
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_resultado := 'ERROR';
        p_user_id := NULL;
    WHEN OTHERS THEN
        p_resultado := 'ERROR';
        p_user_id := NULL;
END;
/

-- 10. PROCEDIMIENTO PARA LOGOUT
-- ================================================
CREATE OR REPLACE PROCEDURE logout_usuario(
    p_token IN VARCHAR2,
    p_resultado OUT VARCHAR2,
    p_mensaje OUT VARCHAR2
)
IS
BEGIN
    UPDATE usuarios
    SET token_sesion = NULL,
        token_expiracion = NULL
    WHERE token_sesion = p_token;
    
    IF SQL%ROWCOUNT > 0 THEN
        COMMIT;
        p_resultado := 'EXITO';
        p_mensaje := 'Logout exitoso';
    ELSE
        p_resultado := 'ERROR';
        p_mensaje := 'Token no válido';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        p_resultado := 'ERROR';
        p_mensaje := 'Error: ' || SQLERRM;
END;
/

-- 11. PROCEDIMIENTO PARA CAMBIAR CONTRASEÑA
-- ================================================
CREATE OR REPLACE PROCEDURE cambiar_password(
    p_user_id IN NUMBER,
    p_old_password IN VARCHAR2,
    p_new_password IN VARCHAR2,
    p_resultado OUT VARCHAR2,
    p_mensaje OUT VARCHAR2
)
IS
    v_old_hash VARCHAR2(200);
    v_new_hash VARCHAR2(200);
    v_stored_hash VARCHAR2(200);
BEGIN
    -- Validar longitud de nueva contraseña
    IF LENGTH(p_new_password) < 6 THEN
        p_resultado := 'ERROR';
        p_mensaje := 'La nueva contraseña debe tener al menos 6 caracteres';
        RETURN;
    END IF;
    
    -- Obtener hash almacenado
    SELECT password_hash INTO v_stored_hash
    FROM usuarios
    WHERE id = p_user_id;
    
    -- Verificar contraseña actual
    v_old_hash := hash_password(p_old_password);
    
    IF v_old_hash != v_stored_hash THEN
        p_resultado := 'ERROR';
        p_mensaje := 'La contraseña actual es incorrecta';
        RETURN;
    END IF;
    
    -- Generar hash de nueva contraseña
    v_new_hash := hash_password(p_new_password);
    
    -- Actualizar contraseña
    UPDATE usuarios
    SET password_hash = v_new_hash,
        fecha_modificacion = SYSDATE
    WHERE id = p_user_id;
    
    COMMIT;
    
    p_resultado := 'EXITO';
    p_mensaje := 'Contraseña actualizada correctamente';
    
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_resultado := 'ERROR';
        p_mensaje := 'Usuario no encontrado';
    WHEN OTHERS THEN
        ROLLBACK;
        p_resultado := 'ERROR';
        p_mensaje := 'Error: ' || SQLERRM;
END;
/

-- 12. INSERTAR USUARIOS DE EJEMPLO
-- ================================================

-- Usuario Admin (password: admin123)
DECLARE
    v_resultado VARCHAR2(50);
    v_mensaje VARCHAR2(200);
    v_user_id NUMBER;
BEGIN
    registrar_usuario(
        p_username => 'admin',
        p_password => 'admin123',
        p_email => 'admin@empresa.com',
        p_nombre_completo => 'Administrador del Sistema',
        p_rol => 'ADMIN',
        p_resultado => v_resultado,
        p_mensaje => v_mensaje,
        p_user_id => v_user_id
    );
    
    DBMS_OUTPUT.PUT_LINE('Admin: ' || v_mensaje);
END;
/

-- Usuario Normal (password: user123)
DECLARE
    v_resultado VARCHAR2(50);
    v_mensaje VARCHAR2(200);
    v_user_id NUMBER;
BEGIN
    registrar_usuario(
        p_username => 'usuario',
        p_password => 'user123',
        p_email => 'usuario@empresa.com',
        p_nombre_completo => 'Usuario de Prueba',
        p_rol => 'USER',
        p_resultado => v_resultado,
        p_mensaje => v_mensaje,
        p_user_id => v_user_id
    );
    
    DBMS_OUTPUT.PUT_LINE('Usuario: ' || v_mensaje);
END;
/

-- 13. CREAR ÍNDICES
-- ================================================
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_token ON usuarios(token_sesion);
CREATE INDEX idx_usuarios_estado ON usuarios(estado);

-- 14. TABLA DE AUDITORÍA (OPCIONAL)
-- ================================================
CREATE TABLE auditoria_login (
    id NUMBER PRIMARY KEY,
    usuario_id NUMBER,
    username VARCHAR2(50),
    accion VARCHAR2(20), -- LOGIN, LOGOUT, FAILED_LOGIN
    ip_address VARCHAR2(50),
    fecha DATE DEFAULT SYSDATE,
    CONSTRAINT fk_audit_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE SEQUENCE auditoria_seq START WITH 1;

-- ================================================
-- VERIFICACIÓN
-- ================================================
SELECT 'Sistema de autenticación instalado correctamente' as resultado FROM dual;
SELECT 'Usuarios creados: ' || COUNT(*) as total FROM usuarios;

import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    nombre_completo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const APEX_API_URL = process.env.REACT_APP_APEX_API_URL || 'http://tu-apex-url.com/ords/apex/api';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${APEX_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Guardar token en localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        // Llamar callback de éxito
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      // Modo demo cuando no hay conexi�n
      if (formData.username && formData.password.length >= 6) {
        const demoUser = {
          username: formData.username,
          nombre_completo: formData.username,
          email: formData.username + '@demo.com'
        };
        const demoToken = 'demo_token_' + Date.now();
        localStorage.setItem('authToken', demoToken);
        localStorage.setItem('userData', JSON.stringify(demoUser));
        onLoginSuccess(demoUser, demoToken);
      } else {
        setError('Usuario o contrase�a inv�lidos. (Modo demo: ingresa usuario y contrase�a de 6+ caracteres)');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${APEX_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          nombre_completo: formData.nombre_completo
        })
      });

      const data = await response.json();

      if (data.success) {
        // Cambiar a login después de registro exitoso
        setIsLogin(true);
        setError('');
        alert('✅ Registro exitoso. Ahora puedes iniciar sesión.');
        // Limpiar formulario
        setFormData({
          username: formData.username,
          password: '',
          email: '',
          nombre_completo: ''
        });
      } else {
        setError(data.message || 'Error al registrar usuario');
      }
    } catch (err) {
      setError('Error de conexión. Verifica tu API de APEX.');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <h1>🔗 WhatsApp APEX</h1>
            <p>Sistema de Gestión de Clientes</p>
          </div>

          <div className="login-tabs">
            <button
              className={isLogin ? 'tab active' : 'tab'}
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
            >
              Iniciar Sesión
            </button>
            <button
              className={!isLogin ? 'tab active' : 'tab'}
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
            >
              Registrarse
            </button>
          </div>

          {error && (
            <div className="error-message">
              ⚠︝ {error}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>Usuario</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Ingresa tu usuario"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Ingresa tu contraseña"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '❳ Iniciando sesión...' : '🔓 Iniciar Sesión'}
              </button>

              <div className="login-info">
                <p>👤 Usuario de prueba: <strong>admin</strong></p>
                <p>🔑 Contraseña: <strong>admin123</strong></p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="login-form">
              <div className="form-group">
                <label>Usuario</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Elige un nombre de usuario"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  name="nombre_completo"
                  placeholder="Tu nombre completo"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '❳ Registrando...' : '📝 Registrarse'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

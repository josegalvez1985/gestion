import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Backend local (API base)
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
      // Usar backend: proxy hacia APEX + emisión de JWT, con abort control
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 13000);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });
      clearTimeout(timer);
      const data = await response.json();

      // Éxito si success=true y se recibe token JWT
      if (data.success && data.token) {
        // Guardar token en localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        // Llamar callback de éxito
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Tiempo de espera agotado al conectar con APEX');
      } else {
        setError('Usuario o contraseña inválidos.');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Registro eliminado: la aplicación no ofrece creación de cuentas

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            {/* Título eliminado */}
          </div>

          {/* Tabs removidas: solo inicio de sesión disponible */}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

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
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
              
            </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

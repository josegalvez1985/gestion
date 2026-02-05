import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [connected, setConnected] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [descuento, setDescuento] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Verificar autenticación al cargar
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('userData');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  // Verificar estado de conexión
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/status`);
        setConnected(response.data.connected);
        setQrCode(response.data.qrCode);
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Manejar login exitoso
  const handleLoginSuccess = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
  };

  // Manejar logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
  };

  // Enviar mensaje manual
  const handleSendMessage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage('');

    try {
      await axios.post(
        `${API_URL}/send-message`,
        { phone: phoneNumber, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatusMessage('✅ Mensaje enviado correctamente');
      setPhoneNumber('');
      setMessage('');
    } catch (error) {
      setStatusMessage('❌ Error al enviar mensaje');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar descuento manual
  const handleUpdateDescuento = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage('');

    // Aquí llamarías directamente a tu API de APEX
    try {
      const response = await axios.post('http://tu-apex-url.com/ords/apex/api/clientes/descuento', {
        telefono: clientPhone,
        descuento: parseFloat(descuento)
      });

      if (response.data.success) {
        setStatusMessage(`✅ Descuento actualizado a ${descuento}% para ${clientPhone}`);
        setClientPhone('');
        setDescuento('');
      } else {
        setStatusMessage('❌ Error al actualizar descuento');
      }
    } catch (error) {
      setStatusMessage('❌ Error de conexión con APEX');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isAuthenticated ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="App">
          <header className="App-header">
            {/* Título eliminado */}
            <div className="user-info">
              <span>{user?.nombre || user?.username}</span>
              <button onClick={handleLogout} className="btn-logout">
                Salir
              </button>
            </div>
          </header>
          <div className="container" />
        </div>
      )}
    </>
  );
}

export default App;

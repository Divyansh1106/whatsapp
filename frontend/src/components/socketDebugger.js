import React, { useEffect, useState } from 'react';
import { getSocket } from '../store/chatStore';

const SocketDebugger = () => {
  const [socketStatus, setSocketStatus] = useState({
    initialized: false,
    connected: false,
    socketId: null,
  });

  useEffect(() => {
    const checkSocket = () => {
      const socket = getSocket();
      setSocketStatus({
        initialized: !!socket,
        connected: socket?.connected || false,
        socketId: socket?.id || null,
      });
    };

    // Check immediately
    checkSocket();

    // Check every 2 seconds
    const interval = setInterval(checkSocket, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#1a1a1a',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      minWidth: '200px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #444', paddingBottom: '8px' }}>
        🔌 Socket Status
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>
          <span style={{ color: '#888' }}>Initialized:</span>{' '}
          <span style={{ color: socketStatus.initialized ? '#4ade80' : '#ef4444' }}>
            {socketStatus.initialized ? '✅' : '❌'}
          </span>
        </div>
        <div>
          <span style={{ color: '#888' }}>Connected:</span>{' '}
          <span style={{ color: socketStatus.connected ? '#4ade80' : '#ef4444' }}>
            {socketStatus.connected ? '✅' : '❌'}
          </span>
        </div>
        <div>
          <span style={{ color: '#888' }}>Socket ID:</span>{' '}
          <span style={{ color: '#60a5fa', fontSize: '10px' }}>
            {socketStatus.socketId || 'None'}
          </span>
        </div>
      </div>
      <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>
        Check browser console for detailed logs
      </div>
    </div>
  );
};

export default SocketDebugger;
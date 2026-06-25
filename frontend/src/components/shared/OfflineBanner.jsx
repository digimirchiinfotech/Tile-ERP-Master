import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import './OfflineBanner.css';

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      
      // Auto-dismiss the "Back online" message after 3 seconds
      setTimeout(() => {
        setShowBackOnline(false);
      }, 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div className={`offline-banner ${isOffline ? 'offline' : 'online'}`}>
      <div className="offline-banner-content">
        {isOffline ? (
          <>
            <WifiOff size={18} className="me-2" />
            <span className="fw-semibold">You are offline. Changes may not save.</span>
          </>
        ) : (
          <>
            <Wifi size={18} className="me-2" />
            <span className="fw-semibold">Back online!</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineBanner;

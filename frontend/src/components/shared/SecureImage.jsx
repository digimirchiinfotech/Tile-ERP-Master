import React, { useState, useEffect } from 'react';
import { tokenManager } from '../../utils/tokenManager.js';
import { resolveImageUrl } from '../../utils/urlHelper.js';

export default function SecureImage({ src, alt, className, style, onClick }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let urlToRevoke = null;
    let isMounted = true;

    const fetchImage = async () => {
      if (!src) {
        setLoading(false);
        return;
      }
      
      try {
        const url = resolveImageUrl(src);
        
        // If it's a data URL, blob URL, or external URL not on our backend, just use it directly
        if (url.startsWith('data:') || url.startsWith('blob:') || (!url.startsWith('/') && !url.includes(import.meta.env.VITE_API_BASE_URL || 'api'))) {
           setObjectUrl(url);
           setLoading(false);
           return;
        }

        const token = tokenManager.getAccessToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Network response was not ok');
        
        const blob = await response.blob();
        if (isMounted) {
          urlToRevoke = URL.createObjectURL(blob);
          setObjectUrl(urlToRevoke);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [src]);

  if (loading) {
    return <div className={`d-flex align-items-center justify-content-center bg-light ${className}`} style={{ ...style, minHeight: '100px' }}><div className="spinner-border text-primary spinner-border-sm" /></div>;
  }

  if (error || !objectUrl) {
    return (
      <div 
        className={`d-flex align-items-center justify-content-center bg-light text-muted ${className}`} 
        style={style}
        onClick={onClick}
      >
        <span style={{ fontSize: '12px' }}>{alt || 'Image Error'}</span>
      </div>
    );
  }

  return (
    <img 
      src={objectUrl} 
      alt={alt} 
      className={className} 
      style={style} 
      onClick={onClick}
    />
  );
}

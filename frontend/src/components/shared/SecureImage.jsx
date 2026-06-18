import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const SecureImage = ({ src, alt, className, style, fallbackSrc = '/placeholder-image.png' }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;

    const fetchImage = async () => {
      if (!src) {
        setLoading(false);
        return;
      }

      // If it's an external URL or data URI, no need for secure fetch
      if (src.startsWith('http') || src.startsWith('data:')) {
        setImgSrc(src);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Make authenticated request to /api/files endpoint
        const filename = src.split('/').pop();
        const response = await api.get(`/files/${filename}`, {
          responseType: 'blob',
        });

        objectUrl = URL.createObjectURL(response.data);
        setImgSrc(objectUrl);
        setError(false);
      } catch (err) {
        console.error('Error fetching secure image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();

    // Cleanup object URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return <div className={`animate-pulse bg-gray-200 ${className}`} style={style} />;
  }

  if (error || !imgSrc) {
    return <img src={fallbackSrc} alt={alt} className={className} style={style} />;
  }

  return <img src={imgSrc} alt={alt} className={className} style={style} />;
};

export default SecureImage;

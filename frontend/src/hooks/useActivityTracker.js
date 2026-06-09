/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

import { useEffect, useRef } from 'react';

/**
 * Track user activity (mouse, keyboard, scroll, touch)
 * Calls callback when user is active
 */
export function useActivityTracker(onActivity, throttleMs = 1000) {
  const timeoutRef = useRef(null);
  const isThrottledRef = useRef(false);

  useEffect(() => {
    const handleActivity = () => {
      if (isThrottledRef.current) return;

      isThrottledRef.current = true;
      onActivity();

      // Throttle activity events to prevent excessive updates
      timeoutRef.current = setTimeout(() => {
        isThrottledRef.current = false;
        timeoutRef.current = null;
      }, throttleMs);
    };

    // Events to track user activity
    const events = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onActivity, throttleMs]);
}

export default useActivityTracker;

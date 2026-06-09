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

import { useRef, useEffect } from 'react';

/**
 * useDoubleScrollbar - Custom hook for synchronized top + bottom horizontal scrollbars
 * 
 * Creates a top scrollbar that stays visible above wide tables,
 * synchronized bidirectionally with the table's native bottom scrollbar.
 * 
 * Usage:
 *   const { tableContainerRef, topScrollbarRef, spacerRef } = useDoubleScrollbar(deps);
 *   
 *   <div ref={topScrollbarRef} className="top-scrollbar-container" style={{...}}>
 *     <div ref={spacerRef} style={{ height: '1px' }} />
 *   </div>
 *   <div ref={tableContainerRef} className="table-responsive">
 *     <Table>...</Table>
 *   </div>
 * 
 * @param {Array} deps - Dependency array to trigger re-measurement (e.g. [productLines])
 * @returns {{ tableContainerRef, topScrollbarRef, spacerRef }}
 */
export default function useDoubleScrollbar(deps = []) {
  const tableContainerRef = useRef(null);
  const topScrollbarRef = useRef(null);
  const spacerRef = useRef(null);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const topScrollbar = topScrollbarRef.current;

    if (!tableContainer || !topScrollbar) return;

    let isScrollingTable = false;
    let isScrollingTop = false;

    const handleTableScroll = () => {
      if (isScrollingTop) {
        isScrollingTop = false;
        return;
      }
      isScrollingTable = true;
      topScrollbar.scrollLeft = tableContainer.scrollLeft;
    };

    const handleTopScroll = () => {
      if (isScrollingTable) {
        isScrollingTable = false;
        return;
      }
      isScrollingTop = true;
      tableContainer.scrollLeft = topScrollbar.scrollLeft;
    };

    tableContainer.addEventListener('scroll', handleTableScroll);
    topScrollbar.addEventListener('scroll', handleTopScroll);

    // Keep the spacer width in sync with the actual table scroll width
    const updateScrollWidth = () => {
      if (spacerRef.current && tableContainer) {
        spacerRef.current.style.width = `${tableContainer.scrollWidth}px`;
      }
    };

    // Small delay to let the DOM settle before measuring
    const timeoutId = setTimeout(updateScrollWidth, 100);

    const resizeObserver = new ResizeObserver(updateScrollWidth);
    resizeObserver.observe(tableContainer);

    return () => {
      tableContainer.removeEventListener('scroll', handleTableScroll);
      topScrollbar.removeEventListener('scroll', handleTopScroll);
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
   
  }, deps);

  return { tableContainerRef, topScrollbarRef, spacerRef };
}

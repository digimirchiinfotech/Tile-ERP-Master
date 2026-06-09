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

import useDoubleScrollbar from '../../hooks/useDoubleScrollbar';

/**
 * DoubleScrollbarWrapper - Wraps a table with synchronized top + bottom horizontal scrollbars.
 * 
 * Usage:
 *   <DoubleScrollbarWrapper deps={[productLines]} wrapperClassName="table-responsive d-none d-lg-block">
 *     <Table bordered hover>...</Table>
 *   </DoubleScrollbarWrapper>
 * 
 * @param {React.ReactNode} children - Table element(s) to wrap
 * @param {Array} deps - Dependencies for scroll re-measurement
 * @param {string} wrapperClassName - CSS class for the scrollable table wrapper
 * @param {object} wrapperStyle - Optional inline styles for the table wrapper
 */
export default function DoubleScrollbarWrapper({ children, deps = [], wrapperClassName = 'table-responsive', wrapperStyle }) {
  const { tableContainerRef, topScrollbarRef, spacerRef } = useDoubleScrollbar(deps);

  return (
    <>
      {/* Top Scrollbar */}
      <div
        ref={topScrollbarRef}
        className="top-scrollbar-container"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          width: '100%',
          height: '8px',
          marginBottom: '2px',
          scrollbarWidth: 'thin',
        }}
      >
        <div ref={spacerRef} style={{ height: '1px' }} />
      </div>

      {/* Table Container */}
      <div ref={tableContainerRef} className={wrapperClassName} style={wrapperStyle}>
        {children}
      </div>
    </>
  );
}

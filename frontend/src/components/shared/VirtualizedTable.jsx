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

import { useState, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Form, Button } from 'react-bootstrap';
import { ChevronUp, ChevronDown } from 'lucide-react';

function VirtualizedTable({
  data = [],
  columns = [],
  height = 400,
  rowHeight = 50,
  onRowClick,
  sortable = true,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={14} className="ms-1" />
    ) : (
      <ChevronDown size={14} className="ms-1" />
    );
  };

  const Row = ({ index, style }) => {
    const item = sortedData[index];

    return (
      <div
        style={style}
        className={`d-flex align-items-center border-bottom ${
          index % 2 === 0 ? 'bg-light' : 'bg-white'
        }`}
        onClick={() => onRowClick?.(item)}
      >
        {columns.map((column, colIndex) => (
          <div
            key={colIndex}
            className="px-3 py-2 text-truncate"
            style={{
              width: column.width || `${100 / columns.length}%`,
              minWidth: column.minWidth || '100px',
            }}
            title={column.render ? '' : String(item[column.key] || '')}
          >
            {column.render
              ? column.render(item[column.key], item, index)
              : item[column.key]}
          </div>
        ))}
      </div>
    );
  };

  const HeaderRow = () => (
    <div className="d-flex bg-primary text-white sticky-top">
      {columns.map((column, index) => (
        <div
          key={index}
          className={`px-3 py-2 fw-bold ${
            sortable && column.sortable !== false ? 'cursor-pointer' : ''
          }`}
          style={{
            width: column.width || `${100 / columns.length}%`,
            minWidth: column.minWidth || '100px',
          }}
          onClick={() => column.sortable !== false && handleSort(column.key)}
        >
          <div className="d-flex align-items-center justify-content-between">
            <span>{column.label}</span>
            {sortable && column.sortable !== false && getSortIcon(column.key)}
          </div>
        </div>
      ))}
    </div>
  );

  if (data.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="virtualized-table">
      <HeaderRow />
      <List
        height={height}
        itemCount={sortedData.length}
        itemSize={rowHeight}
        itemData={sortedData}
      >
        {Row}
      </List>

      <div className="mt-2 text-muted small text-center">
        Showing {sortedData.length} of {data.length} records
      </div>

      <style>{`
        .virtualized-table {
          border: 1px solid #dee2e6;
          border-radius: 0.375rem;
          overflow: hidden;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .cursor-pointer:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}

export default VirtualizedTable;





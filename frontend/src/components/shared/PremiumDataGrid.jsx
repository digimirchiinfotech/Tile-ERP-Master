import React from 'react';
import { Table } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * PremiumDataGrid
 * A standardized, premium data table with sticky headers, hover effects,
 * and built-in empty state handling. Designed to replace standard Bootstrap tables.
 */
const PremiumDataGrid = ({
  columns,
  data,
  keyField = 'id',
  isLoading = false,
  emptyMessage = 'No data available.',
  onRowClick,
  rowClassName,
  className = '',
  ...props
}) => {
  return (
    <div className={`premium-data-grid ${className}`}>
      <div className="table-container">
        <Table hover className="mb-0 align-middle" borderless {...props}>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th 
                  key={col.key || idx} 
                  className={col.headerClassName || ''}
                  style={{ 
                    width: col.width || 'auto',
                    textAlign: col.align || 'left'
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr 
                  key={row[keyField] || rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  className={typeof rowClassName === 'function' ? rowClassName(row) : rowClassName}
                >
                  {columns.map((col, colIndex) => (
                    <td 
                      key={`${row[keyField] || rowIndex}-${col.key || colIndex}`}
                      className={col.cellClassName || ''}
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {col.render ? col.render(row, rowIndex) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-5 text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

PremiumDataGrid.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.node.isRequired,
    render: PropTypes.func,
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    align: PropTypes.oneOf(['left', 'center', 'right']),
    headerClassName: PropTypes.string,
    cellClassName: PropTypes.string,
  })).isRequired,
  data: PropTypes.array.isRequired,
  keyField: PropTypes.string,
  isLoading: PropTypes.bool,
  emptyMessage: PropTypes.node,
  onRowClick: PropTypes.func,
  rowClassName: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  className: PropTypes.string,
};

export default PremiumDataGrid;

import React from 'react';

/**
 * A responsive skeleton table loader to be shown while data is fetching.
 * Uses CSS pulse animations to indicate loading state.
 */
const SkeletonTable = ({ columns = 5, rows = 5 }) => {
  return (
    <div className="table-responsive skeleton-wrapper">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={`th-${index}`}>
                <div className="skeleton-line skeleton-header"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`tr-${rowIndex}`}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={`td-${rowIndex}-${colIndex}`}>
                  <div className="skeleton-line skeleton-cell"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .skeleton-wrapper {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
        }
        
        .skeleton-line {
          background: #e2e5e7;
          border-radius: 4px;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        .skeleton-header {
          height: 16px;
          width: 70%;
          margin: 4px 0;
        }

        .skeleton-cell {
          height: 14px;
          width: 90%;
          margin: 6px 0;
        }

        /* Randomize widths slightly for a more organic look */
        td:nth-child(even) .skeleton-cell {
          width: 60%;
        }
        td:nth-child(3n) .skeleton-cell {
          width: 80%;
        }

        @keyframes skeleton-pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default SkeletonTable;

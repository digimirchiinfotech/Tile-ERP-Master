 import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class TableErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Table Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-5 bg-light rounded border border-danger border-opacity-25 my-3">
          <AlertTriangle size={48} className="text-danger mb-3" />
          <h5 className="text-danger">Failed to load table data</h5>
          <p className="text-muted small mb-3">
            An unexpected error occurred while rendering this table. 
            The rest of the page remains functional.
          </p>
          <button 
            className="btn btn-outline-danger btn-sm"
            onClick={() => this.setState({ hasError: false })}
          >
            <RefreshCw size={14} className="me-2" /> Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default TableErrorBoundary;

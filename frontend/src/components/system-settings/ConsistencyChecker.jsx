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

import { useState } from 'react';
import { Card, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { CheckCircle, AlertTriangle, Database, Check } from 'lucide-react';
import api from '../../services/api.js';

function ConsistencyChecker() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runCheck = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/consistency-check');
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run consistency check');
    } finally {
      setLoading(false);
    }
  };

  const warningCount = result?.issues?.filter(i => i.severity === 'warning').length || 0;
  const errorCount = result?.issues?.filter(i => i.severity === 'error').length || 0;

  return (
    <Card className="mt-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <Database size={18} className="me-2" />
          Data Consistency Check
        </h5>
        <Button variant="primary" onClick={runCheck} disabled={loading}>
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Running...
            </>
          ) : (
            'Run Data Consistency Check'
          )}
        </Button>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error?.message || error?.toString() || 'Consistency check failed'}</Alert>}

        {result && result.totalIssues === 0 && (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-success mb-3" />
            <h5 className="text-success">All data is perfectly consistent</h5>
            <div className="text-muted small mt-2 mb-3">
              <p className="mb-1"><strong>Real Data Verified:</strong></p>
              <ul className="list-inline">
                <li className="list-inline-item mx-2">• {result.stats?.proformaInvoicesChecked || 0} Proforma Invoices</li>
                <li className="list-inline-item mx-2">• {result.stats?.exportInvoicesChecked || 0} Export Invoices</li>
                <li className="list-inline-item mx-2">• {result.stats?.packingListsChecked || 0} Packing Lists</li>
                <li className="list-inline-item mx-2">• {result.stats?.qcRecordsChecked || 0} QC Records</li>
                <li className="list-inline-item mx-2">• {result.stats?.vgmDocumentsChecked || 0} VGM Documents</li>
                <li className="list-inline-item mx-2">• {result.stats?.shippingInstructionsChecked || 0} Shipping Instructions</li>
                <li className="list-inline-item mx-2">• {result.stats?.annexuresChecked || 0} Annexures</li>
              </ul>
            </div>
            <p className="text-muted">
              Checked at {new Date(result.checkedAt).toLocaleString()}
            </p>
          </div>
        )}

        {result && result.totalIssues > 0 && (
          <>
            <div className="mb-3 d-flex gap-3">
              <Badge bg="warning" text="dark" className="p-2 fs-6">
                <AlertTriangle size={14} className="me-1" />
                {warningCount} warning{warningCount !== 1 ? 's' : ''}
              </Badge>
              <Badge bg="danger" className="p-2 fs-6">
                {errorCount} error{errorCount !== 1 ? 's' : ''}
              </Badge>
              <span className="text-muted align-self-center">
                Checked at {new Date(result.checkedAt).toLocaleString()}
              </span>
            </div>
            <Table striped bordered hover responsive size="sm">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Table</th>
                  <th>Record ID</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {result.issues.map((issue, idx) => (
                  <tr key={idx}>
                    <td>
                      <Badge bg={issue.severity === 'error' ? 'danger' : 'warning'} text={issue.severity === 'warning' ? 'dark' : undefined}>
                        {issue.severity}
                      </Badge>
                    </td>
                    <td>{issue.type}</td>
                    <td><code>{issue.table}</code></td>
                    <td>{issue.recordId}</td>
                    <td>{issue.description}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}

        {!result && !error && (
          <p className="text-muted text-center py-3">
            Click the button above to run a data consistency check across the system.
          </p>
        )}
      </Card.Body>
    </Card>
  );
}

export default ConsistencyChecker;

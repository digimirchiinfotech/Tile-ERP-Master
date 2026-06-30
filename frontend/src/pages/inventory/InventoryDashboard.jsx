import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup } from 'react-bootstrap';
import { Search, Plus, Archive, FileText, ArrowUpRight, ArrowDownRight, Edit } from 'lucide-react';
import { authAPI } from '../../services/authAPI';
import NotificationManager, { showSuccess, showError } from '../../components/shared/NotificationManager';
import { useUserContext } from '../../contexts/UserContext';

const InventoryDashboard = () => {
  const { currentUser } = useUserContext();
  const [warehouses, setWarehouses] = useState([]);
  const [stockBalances, setStockBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [whRes, stockRes, transRes] = await Promise.all([
        authAPI.get('/inventory/warehouses'),
        authAPI.get('/inventory/stock-balance'),
        authAPI.get('/inventory/movements?limit=10')
      ]);
      setWarehouses(whRes.data?.data || []);
      setStockBalances(stockRes.data?.data || []);
      setTransactions(transRes.data?.data?.data || []); // Paginated response
    } catch (error) {
      showError('Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stockBalances.filter(item => 
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container fluid className="py-4">
      <NotificationManager />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h3 mb-0 text-gray-800">Inventory Dashboard</h2>
          <p className="text-muted mb-0">Manage warehouses and stock balances</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary">
            <Plus size={18} className="me-2" />
            Add Warehouse
          </Button>
          <Button variant="primary">
            <Plus size={18} className="me-2" />
            New Transaction
          </Button>
        </div>
      </div>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm border-0 bg-primary text-white h-100">
            <Card.Body>
              <h6 className="text-uppercase mb-2 opacity-75">Total Warehouses</h6>
              <h2 className="mb-0">{warehouses.length}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 bg-success text-white h-100">
            <Card.Body>
              <h6 className="text-uppercase mb-2 opacity-75">Products In Stock</h6>
              <h2 className="mb-0">{stockBalances.filter(s => parseFloat(s.boxes_available) > 0).length}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 bg-info text-white h-100">
            <Card.Body>
              <h6 className="text-uppercase mb-2 opacity-75">Recent Transactions</h6>
              <h2 className="mb-0">{transactions.length}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={8} className="mb-4">
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-bottom-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Current Stock</h5>
              <div style={{ width: '250px' }}>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light border-end-0">
                    <Search size={14} />
                  </InputGroup.Text>
                  <Form.Control
                    className="border-start-0 bg-light"
                    placeholder="Search product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Product</th>
                        <th>Warehouse</th>
                        <th className="text-end">Available (Boxes)</th>
                        <th className="text-end">Committed (Boxes)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.length > 0 ? (
                        filteredStock.map((stock, i) => (
                          <tr key={i}>
                            <td>
                              <div className="fw-medium">{stock.product_name}</div>
                              {stock.sku && <small className="text-muted">{stock.sku}</small>}
                            </td>
                            <td>{stock.warehouse_name || 'Main'}</td>
                            <td className="text-end">
                              <Badge bg={parseFloat(stock.boxes_available) > 0 ? 'success' : 'danger'}>
                                {stock.boxes_available}
                              </Badge>
                            </td>
                            <td className="text-end">{stock.boxes_committed || 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-4 text-muted">
                            No stock records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mb-4">
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
              <h5 className="mb-0">Recent Transactions</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : (
                <div className="transaction-list">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <div key={tx.id} className="d-flex align-items-center mb-3 p-3 border rounded">
                        <div className={`rounded-circle p-2 me-3 ${tx.transaction_type === 'GRN' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                          {tx.transaction_type === 'GRN' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{tx.product_name}</h6>
                          <div className="text-muted small d-flex justify-content-between">
                            <span>{tx.reference_number || tx.transaction_type}</span>
                            <span>{new Date(tx.transaction_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="ms-3 text-end">
                          <strong className={tx.transaction_type === 'GRN' ? 'text-success' : 'text-danger'}>
                            {tx.transaction_type === 'GRN' ? '+' : '-'}{tx.boxes_quantity}
                          </strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <Archive size={40} className="mb-2 opacity-50" />
                      <p>No recent transactions</p>
                    </div>
                  )}
                </div>
              )}
              {transactions.length > 0 && (
                <div className="text-center mt-3">
                  <Button variant="link" className="text-decoration-none">
                    View Full Ledger
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default InventoryDashboard;

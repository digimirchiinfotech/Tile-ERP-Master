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

/**
 * Payment Form Component
 * Integrated Stripe payment processing for export invoices
 */

import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner, Card, Row, Col, Badge } from 'react-bootstrap';
import { CreditCard, Wallet, Landmark, Lock, ShieldCheck, CheckCircle } from 'lucide-react';
import axios from 'axios';

const PaymentForm = ({ invoiceId, invoiceNo, amount, clientEmail }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [clientSecret, setClientSecret] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // Format amount for display
  const formattedAmount = (amount / 100).toFixed(2);

  /**
   * Create payment intent on load
   */
  useEffect(() => {
    if (!invoiceId) return;

    const createIntent = async () => {
      try {
        setLoading(true);
        const response = await axios.post('/api/payments/create-intent', {
          invoiceId
        });

        if (response.data.success) {
          setClientSecret(response.data.data.clientSecret);
          setPaymentStatus('ready');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to initialize payment');
        setPaymentStatus('failed');
      } finally {
        setLoading(false);
      }
    };

    createIntent();
  }, [invoiceId]);

  /**
   * Handle Stripe payment
   */
  const handleStripePayment = async () => {
    try {
      setLoading(true);
      setError('');

      // In production, use Stripe Elements library
      // For now, simulate the payment flow
      const response = await axios.post('/api/payments/confirm', {
        paymentIntentId: clientSecret,
        invoiceId
      });

      if (response.data.success) {
        setSuccess('Payment processed successfully!');
        setPaymentStatus('completed');
        
        // Callback to parent component
        if (window.onPaymentSuccess) {
          window.onPaymentSuccess({
            invoiceId,
            paymentMethod: 'stripe',
            transactionId: response.data.data.paymentRef
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle PayPal payment
   */
  const handlePayPalPayment = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post('/api/payments/paypal/create', {
        invoiceId
      });

      if (response.data.success) {
        // Redirect to PayPal approval URL
        window.location.href = response.data.data.approvalUrl;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'PayPal payment failed');
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Razorpay payment
   */
  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post('/api/payments/razorpay/create', {
        invoiceId
      });

      if (response.data.success) {
        // In production, open Razorpay checkout modal
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY,
          order_id: response.data.data.orderId,
          amount: amount,
          currency: 'INR',
          name: 'Tile Exporter',
          description: `Invoice #${invoiceNo}`,
          image: '/logo.png',
          handler: (paymentResponse) => {
            handleRazorpaySuccess(paymentResponse);
          },
          prefill: {
            email: clientEmail
          },
          theme: {
            color: '#1976d2'
          }
        };

        // const razorpay = new window.Razorpay(options);
        // razorpay.open();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Razorpay payment failed');
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Razorpay success callback
   */
  const handleRazorpaySuccess = async (response) => {
    try {
      // Confirm with backend
      await axios.post('/api/payments/confirm', {
        paymentIntentId: response.razorpay_payment_id,
        invoiceId
      });

      setSuccess('Payment completed successfully!');
      setPaymentStatus('completed');

      if (window.onPaymentSuccess) {
        window.onPaymentSuccess({
          invoiceId,
          paymentMethod: 'razorpay',
          transactionId: response.razorpay_payment_id
        });
      }
    } catch (err) {
      setError('Payment confirmation failed');
      setPaymentStatus('failed');
    }
  };

  if (paymentStatus === 'completed') {
    return (
      <Alert variant="primary" className="d-flex align-items-center border-0 shadow-sm rounded-4 p-4">
        <CheckCircle size={32} className="text-primary me-3" />
        <div>
          <h5 className="mb-1 fw-bold">Payment Completed</h5>
          <p className="mb-0 opacity-75">Your payment has been processed successfully. Thank you!</p>
        </div>
      </Alert>
    );
  }

  return (
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
      <Card.Header className="bg-white py-3 px-4 border-0">
        <Card.Title className="mb-0 d-flex align-items-center gap-2 fw-bold text-primary">
          <CreditCard size={20} />
          Payment Gateway
        </Card.Title>
      </Card.Header>
      
      <Card.Body>
        {/* Invoice Summary */}
        <div className="mb-4 p-3 bg-light rounded">
          <Row>
            <Col md={6}>
              <small className="text-muted">Invoice No</small>
              <h5>{invoiceNo}</h5>
            </Col>
            <Col md={6} className="text-end">
              <small className="text-muted">Amount Due</small>
              <h5 className="text-primary">₹{formattedAmount}</h5>
            </Col>
          </Row>
        </div>

        {/* Error Alert */}
        {error && <Alert variant="secondary" onClose={() => setError('')} dismissible>{error}</Alert>}

        {/* Success Alert */}
        {success && <Alert variant="primary">{success}</Alert>}

        {/* Payment Method Selection */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-bold text-muted small text-uppercase mb-3">Select Payment Method</Form.Label>
          <div className="payment-segmented-control">
            {[
              { id: 'stripe', label: 'Stripe', icon: CreditCard },
              { id: 'paypal', label: 'PayPal', icon: Wallet },
              { id: 'razorpay', label: 'Razorpay', icon: Landmark }
            ].map((method) => (
              <div 
                key={method.id}
                className={`payment-method-item ${paymentMethod === method.id ? 'active' : ''}`}
                onClick={() => !loading && setPaymentMethod(method.id)}
              >
                <method.icon size={20} className="mb-2" />
                <span>{method.label}</span>
                {paymentMethod === method.id && <div className="active-dot" />}
              </div>
            ))}
          </div>
        </Form.Group>

        {/* Payment Button */}
        <Button
          variant="primary"
          size="lg"
          className="w-100 py-3 rounded-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
          onClick={() => {
            switch (paymentMethod) {
              case 'stripe':
                handleStripePayment();
                break;
              case 'paypal':
                handlePayPalPayment();
                break;
              case 'razorpay':
                handleRazorpayPayment();
                break;
              default:
                break;
            }
          }}
          disabled={loading || paymentStatus !== 'ready'}
        >
          {loading ? (
            <>
              <Spinner as="span" animation="border" size="sm" />
              Processing...
            </>
          ) : (
            <>
              <Lock size={18} />
              Pay ₹{formattedAmount}
            </>
          )}
        </Button>

        <div className="mt-4 p-3 bg-light rounded-3 d-flex align-items-center gap-2 border border-light">
          <ShieldCheck size={18} className="text-success" />
          <small className="text-muted">
            Secure, encrypted payment processed by {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
          </small>
        </div>
      </Card.Body>

      <style>{`
        .payment-segmented-control {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .payment-method-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: #f8fafc;
          border: 2px solid #f1f5f9;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          color: #64748b;
        }

        .payment-method-item:hover {
          background: #f1f5f9;
          border-color: #e2e8f0;
          color: #475569;
        }

        .payment-method-item.active {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.1);
        }

        .active-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
        }

        .payment-method-item span {
          font-weight: 600;
          font-size: 0.9rem;
        }

        @media (max-width: 576px) {
          .payment-segmented-control {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Card>
  );
};

export default PaymentForm;





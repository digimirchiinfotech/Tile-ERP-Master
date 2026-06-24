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

import { forwardRef } from 'react';
import { formatPrice } from '../../utils/formatters.js';
import { useProfile } from '../../hooks/useProfile.js';

const ClientOrderPrintView = forwardRef(({ orderData }, ref) => {
  const { profile } = useProfile();
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '.');
  };

  const formatNumber = (num) => {
    return num ? num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) : '0.00';
  };

  const totalAmount = orderData?.totalAmount || 0;
  
  const totalBoxes = orderData?.productLines?.reduce((sum, p) => sum + (p.quantity || p.totalBoxes || 0), 0) || 0;
  const totalValue = orderData?.productLines?.reduce((sum, p) => sum + (p.totalValue || p.amount || 0), 0) || 0;

  return (
    <div ref={ref} className="client-order-print-view">
      <style>{`
        .client-order-print-view {
          background: white;
          width: 210mm;
          min-height: 100%; height: auto;
          margin: 0 auto;
          padding: 20mm;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .order-title {
          font-size: 24pt;
          font-weight: bold;
          color: #1e40af;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .info-box {
          width: 45%;
        }
        .info-label {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10pt;
          color: #666;
          margin-bottom: 5px;
        }
        .product-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .product-table th {
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 10px;
          text-align: left;
          font-size: 10pt;
        }
        .product-table td {
          border: 1px solid #e5e7eb;
          padding: 10px;
          font-size: 10pt;
        }
        .totals-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          width: 300px;
          padding: 5px 0;
        }
        .grand-total {
          border-top: 2px solid #333;
          margin-top: 10px;
          padding-top: 10px;
          font-weight: bold;
          font-size: 14pt;
        }
        .footer {
          margin-top: 50px;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
          font-size: 9pt;
          color: #666;
        }
        @media print {
          .client-order-print-view {
            margin: 0;
            padding: 15mm;
          }
        }
      `}</style>

      <div className="header">
        <div>
          <div className="order-title">SALES ORDER</div>
          <div>Order No: {orderData?.orderNo || orderData?.order_no || orderData?.orderId || 'N/A'}</div>
          <div>Date: {formatDate(orderData?.date || orderData?.orderDate)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>{profile?.company_name || 'TILE EXPORTER SOLUTION'}</div>
          <div style={{ whiteSpace: 'pre-line' }}>{profile?.address || 'Morbi, Gujarat, India'}</div>
          <div>Contact: {profile?.phone || profile?.contact_number || '+91 99999 88888'}</div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-box">
          <div className="info-label">Bill To:</div>
          <div style={{ fontWeight: 'bold' }}>{orderData?.clientName || orderData?.client_firm_name || 'N/A'}</div>
          <div style={{ whiteSpace: 'pre-line' }}>{orderData?.shipping_address || orderData?.shippingAddress || 'N/A'}</div>
          <div>{orderData?.country || orderData?.client_country || ''}</div>
        </div>
        <div className="info-box" style={{ textAlign: 'right' }}>
          <div className="info-label">Order Details:</div>
          <div>Status: {orderData?.status}</div>
          <div>Invoice Ref: {orderData?.invoiceRef || orderData?.invoice_ref || orderData?.linkedInvoice || 'N/A'}</div>
          <div>Currency: {orderData?.currency || 'USD'}</div>
        </div>
      </div>

      <table className="product-table">
        <thead>
          <tr>
            <th>Product Description</th>
            <th>Size/Surface</th>
            <th style={{ textAlign: 'center' }}>Qty (Boxes)</th>
            <th style={{ textAlign: 'right' }}>Unit Price</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(orderData?.productLines || orderData?.product_lines)?.map((item, index) => (
            <tr key={index}>
              <td>{item.productName || item.product || 'N/A'}</td>
              <td>{item.size} / {item.surface}</td>
              <td style={{ textAlign: 'center' }}>{item.quantity || item.totalBoxes || 0}</td>
              <td style={{ textAlign: 'right' }}>{formatNumber(item.unitPrice || item.rate || 0)}</td>
              <td style={{ textAlign: 'right' }}>{formatNumber(item.totalValue || item.amount || 0)}</td>
            </tr>
          )) || (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>No items found</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="totals-section">
        <div className="total-row">
          <span>Subtotal:</span>
          <span>{formatNumber(totalValue)}</span>
        </div>
        <div className="total-row grand-total">
          <span>Grand Total:</span>
          <span>{formatPrice(totalValue, orderData?.currency || 'USD')}</span>
        </div>
      </div>

      <div className="footer">
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Terms & Conditions:</div>
        <ol>
          <li>Goods once sold will not be taken back or exchanged.</li>
          <li>Subject to local jurisdiction.</li>
          <li>Payment should be made within agreed credit period.</li>
        </ol>
        <div style={{ marginTop: '30px', textAlign: 'right' }}>
          <div style={{ marginBottom: '40px' }}>For, {profile?.company_name || 'TILE EXPORTER SOLUTION'}</div>
          <div>Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
});

ClientOrderPrintView.displayName = 'ClientOrderPrintView';

export default ClientOrderPrintView;

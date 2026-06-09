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
 * Transform Certificate data from frontend format to backend format
 */
export const transformCertificateToBackend = (data) => {
  return {
    certificate_type: data.certificates?.[0]?.type?.trim() || 'Certificate of Origin',
    issue_date: data.date || new Date().toLocaleDateString('en-CA'),
    invoice_ref: data.invoiceReference || 'N/A',
    status: 'Applied',
    fees: parseFloat(data.totalFees) || 0
  };
};


/**
 * Transform Certificate data from backend format to frontend format
 */
export const transformCertificateToFrontend = (data) => {
  if (!data) return null;
  return {
    id: data.id,
    certificateId: data.certificate_no || data.certificateId,
    date: data.issue_date,
    invoiceReference: data.invoice_ref || data.invoiceReference,
    clientName: data.client_name || data.clientName,
    certificates: [
      {
        type: data.certificate_type,
        status: data.status,
        issueDate: data.issue_date,
        fees: data.fees || 0,
        remarks: data.notes
      }
    ],
    paymentStatus: 'Pending',
    totalFees: data.fees || 0,
    specialInstructions: data.notes
  };
};

/**
 * Transform Shipping Instructions from backend format to frontend format
 */
export const transformShippingInstructionToFrontend = (data) => {
  if (!data) return null;
  return {
    id: data.id,
    instructionNo: data.instruction_no,
    date: data.date,
    invoiceReference: data.invoice_reference,
    clientName: data.client_name,
    shipperDetails: data.shipper_details,
    consigneeDetails: data.consignee_details,
    notifyPartyDetails: data.notify_party_details,
    vesselName: data.vessel_name,
    voyageNo: data.voyage_no,
    bookingNo: data.booking_no,
    hblNo: data.hbl_no,
    placeOfDelivery: data.place_of_delivery,
    shippingBillNo: data.shipping_bill_no,
    shippingBillDate: data.shipping_bill_date,
    freightForwarder: data.freight_forwarder,
    freightDetails: data.freight_details,
    freightTerms: data.freight_terms,
    status: data.status,
    urgency: data.urgency,
    shippingDetails: data.shipping_details,
    cargoDetails: data.cargo_details,
    containerDetails: data.container_details,
    specialInstructions: data.special_instructions,
    documentsRequired: data.documents_required
  };
};

/**
 * Transform Customs Clearance from backend format to frontend format
 */
export const transformCustomsClearanceToFrontend = (data) => {
  if (!data) return null;
  return {
    id: data.id,
    clearanceNo: data.clearance_no,
    date: data.date,
    invoiceReference: data.invoice_reference,
    clientName: data.client_name,
    shippingBillNo: data.shipping_bill_no,
    status: data.status,
    chaDetails: data.cha_details,
    portOfClearance: data.port_of_clearance
  };
};


/**
 * Apply transformation to an array of items
 */
export const transformArray = (data, transformFn) => {
  if (!Array.isArray(data)) return [];
  return data.map(item => transformFn(item)).filter(Boolean);
};

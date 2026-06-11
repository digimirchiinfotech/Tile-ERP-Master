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
 * Status Transition Validator
 * Enforces valid state machine transitions for each document type.
 * Prevents illegal status regressions (e.g., Locked → Draft) via API.
 */

const ALLOWED_TRANSITIONS = {
  proforma_invoice: {
    Draft:     ['Sent', 'Approved', 'Locked', 'Revised', 'Cancelled'],
    Sent:      ['Approved', 'Draft', 'Revised', 'Cancelled'],
    Approved:  ['Locked', 'Sent', 'Revised', 'Converted', 'Cancelled'],
    Locked:    ['Approved'], // Only admins can unlock → moves back to Approved
    Converted: ['Revised', 'Approved', 'Draft'], // Allow revising or reverting to Approved/Draft
    Revised:   ['Draft', 'Sent', 'Approved', 'Cancelled'],
    Cancelled: [],           // Terminal
  },
  export_invoice: {
    Draft:      ['Sent', 'Finalized', 'Locked'],
    Sent:       ['Finalized', 'Draft', 'Locked'],
    Finalized:  ['Dispatched', 'Locked', 'Sent'],
    Dispatched: ['Locked', 'Finalized'],
    Locked:     ['Finalized'], // Only unlocked by admin to Finalized
    Converted:  ['Finalized', 'Draft'], // Allow reverting to Finalized/Draft
  },
  proforma_order: {
    Draft:           ['Confirmed', 'Cancelled'],
    Confirmed:       ['In Production', 'Cancelled', 'Draft'],
    'In Production': ['Completed', 'Confirmed'],
    Completed:       ['Locked'],
    Locked:          ['Completed'],
    Cancelled:       [],
    // Additional statuses
    REVISION_REQUIRED: ['Confirmed', 'Draft'],
    PENDING:           ['Confirmed', 'Draft'],
  },
  qc_record: {
    Pending:     ['Passed', 'Failed', 'Conditional Pass'],
    Failed:      ['Pending', 'Passed', 'Conditional Pass'],
    Passed:      ['Locked'],
    'Conditional Pass': ['Passed', 'Failed'],
    Locked:      ['Passed'],
  },
  packing_list: {
    Draft:     ['Finalized', 'Locked'],
    Finalized: ['Locked', 'Draft'],
    Locked:    ['Finalized'],
  },
};

/**
 * Validate a status transition for a given document type.
 * @param {string} documentType - e.g., 'export_invoice', 'proforma_invoice'
 * @param {string} currentStatus - Current status of the document
 * @param {string} newStatus - Proposed new status
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateStatusTransition(documentType, currentStatus, newStatus) {
  // If the status isn't changing, always valid
  if (currentStatus === newStatus) return { valid: true };

  const machine = ALLOWED_TRANSITIONS[documentType];
  if (!machine) {
    // No state machine defined for this type — allow all transitions
    return { valid: true };
  }

  const allowedNext = machine[currentStatus];
  if (!allowedNext) {
    // Unknown current status — be permissive to avoid breaking existing data
    return { valid: true };
  }

  if (allowedNext.length === 0) {
    return {
      valid: false,
      reason: `Document status '${currentStatus}' is terminal. No further status changes are permitted.`,
    };
  }

  if (!allowedNext.includes(newStatus)) {
    return {
      valid: false,
      reason: `Invalid status transition: '${currentStatus}' → '${newStatus}'. Allowed transitions: ${allowedNext.join(', ')}.`,
    };
  }

  return { valid: true };
}

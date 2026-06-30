import { AppError } from '../middleware/errorHandler.js';
import { debugLogger } from '../utils/debugLogger.js';
import { successResponse } from '../utils/helpers.js';

/**
 * Validates a GSTIN using basic regular expression and returns mock verification data.
 */
export const validateGSTIN = async (req, res, next) => {
  try {
    const { gstin } = req.body;
    
    if (!gstin) {
      return next(new AppError('GSTIN is required', 400));
    }

    const cleanGstin = gstin.trim().toUpperCase();
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!gstinRegex.test(cleanGstin)) {
      return res.status(200).json({
        success: true,
        data: {
          is_valid: false,
          verified: false,
          message: 'Invalid GSTIN Format'
        }
      });
    }

    // Mock response for valid format
    return successResponse(res, {
      is_valid: true,
      verified: true,
      gstin: cleanGstin,
      trade_name: `Mock Trade Name for ${cleanGstin}`,
      legal_name: `Mock Legal Name`,
      status: 'Active',
      registration_type: 'Regular',
      taxpayer_type: 'Normal'
    }, 'GSTIN verified successfully');
    
  } catch (error) {
    debugLogger.error('GSTIN Validation Error', error.message);
    next(error);
  }
};

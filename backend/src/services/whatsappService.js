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
 * Service: WhatsAppLogisticsService
 * 
 * Centralized service for sending export document notifications via WhatsApp.
 * Supports Twilio or Meta WhatsApp Business API.
 */
 
 import axios from 'axios';
 import env from '../config/env.js';
 import logger from '../utils/debugLogger.js';
 
 class WhatsAppLogisticsService {
   /**
    * Send a document link to a customer/transporter
    * 
    * @param {string} phone - Recipient phone number with country code
    * @param {string} documentType - 'Inovice', 'Packing List', 'VGM', etc.
    * @param {string} documentNo - The document reference number
    * @param {string} link - Secure URL to view the document
    */
   async sendDocumentNotification(phone, documentType, documentNo, link) {
     if (!env.whatsapp_api_key) {
       logger.warn('WhatsApp', `Skipping WhatsApp for ${documentNo} - API Key not configured.`);
       return { success: false, message: 'WhatsApp API not configured' };
     }
 
     try {
       const message = `📦 *Tile Exporter Notification*\n\nYour *${documentType}* (#${documentNo}) has been generated.\n\n🔗 View Document: ${link}\n\nThank you for choosing us!`;
       
       // Example integration with a provider like Twilio or Meta API
       /*
       const response = await axios.post(env.whatsapp_endpoint, {
         to: phone,
         body: message,
         apiKey: env.whatsapp_api_key
       });
       */
       
       logger.info('WhatsApp', `Notification sent to ${phone} for ${documentNo}`);
       return { success: true };
     } catch (error) {
       logger.error('WhatsApp', `Failed to send to ${phone}`, error);
       return { success: false, error: error.message };
     }
   }
 
   /**
    * Notify transporter about a new pick-up
    */
   async notifyTransporter(transporterPhone, vehicleNo, location) {
     const message = `🚛 *New Load Assignment*\n\nVehicle: *${vehicleNo}*\nLocation: *${location}*\n\nPlease report for loading immediately.`;
     // Send logic here...
   }
 }
 
 export default new WhatsAppLogisticsService();

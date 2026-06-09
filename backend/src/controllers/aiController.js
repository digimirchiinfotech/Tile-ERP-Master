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

import OpenAI from 'openai';
import { debugLogger } from '../utils/debugLogger.js';
import pool from '../config/database-wrapper.js';

let client = null;

if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  try {
    client = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  } catch (error) {
    debugLogger.warn('⚠️  OpenAI initialization failed:', error.message);
  }
}

export const getDocumentInsights = async (req, res, next) => {
  try {
    if (!client) {
      return res.status(503).json({ success: false, error: 'AI service is not configured.' });
    }

    const { documentId, type } = req.body;
    if (!documentId || !type) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: documentId and type' });
    }
    
    if (!['invoice', 'qc'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid type. Must be "invoice" or "qc"' });
    }
    
    let content = '';
    if (type === 'invoice') {
      const result = await req.db.query('SELECT * FROM proforma_invoices WHERE id = $1', [documentId]);
      if (!result.rows?.[0]) return res.status(404).json({ success: false, error: 'Invoice not found' });
      content = JSON.stringify(result.rows[0]);
    } else if (type === 'qc') {
      const result = await req.db.query('SELECT * FROM qc_records WHERE id = $1', [documentId]);
      if (!result.rows?.[0]) return res.status(404).json({ success: false, error: 'QC record not found' });
      content = JSON.stringify(result.rows[0]);
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a professional export manager assistant. Provide a highly detailed summary.' },
        { role: 'user', content: `Analyze this ${type}: ${content}` }
      ],
      max_tokens: 800
    });

    res.json({ success: true, summary: response.choices[0].message.content });
  } catch (error) {
    next(error);
  }
};

export const chatWithAssistant = async (req, res, next) => {
  try {
    if (!client) {
      return res.status(503).json({ success: false, error: 'AI service is not configured.' });
    }

    const { message, history = [] } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert ERP Implementation Consultant for the Tile Exporter Solution.' },
        ...history,
        { role: 'user', content: message }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    res.json({ success: true, reply: response.choices[0].message.content });
  } catch (error) {
    next(error);
  }
};

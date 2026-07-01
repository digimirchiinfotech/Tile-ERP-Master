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

import { v4 as uuidv4 } from 'uuid';
import { generatePdfFromHtml } from '../services/pdfService.js';
import { AppError } from '../middleware/errorHandler.js';
import { debugLogger } from '../utils/debugLogger.js';

// In-memory store for PDF tasks (taskId -> { status, buffer, error, createdAt })
const pdfTaskStore = new Map();

// Cleanup old tasks every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [taskId, task] of pdfTaskStore.entries()) {
    if (now - task.createdAt > 5 * 60 * 1000) {
      pdfTaskStore.delete(taskId);
    }
  }
}, 60000).unref();

export const generatePdf = async (req, res, next) => {
  try {
    const { html, filename = 'document.pdf', format = 'A4' } = req.body;

    if (!html) {
      return next(new AppError('HTML content is required', 400));
    }

    const taskId = uuidv4();
    pdfTaskStore.set(taskId, { status: 'processing', buffer: null, error: null, createdAt: Date.now() });

    debugLogger.info('[PDFController]', `Queued async PDF generation: ${filename} (Task: ${taskId})`);

    // Fire and forget - do not await
    generatePdfFromHtml(html, { format })
      .then((pdfBuffer) => {
        const task = pdfTaskStore.get(taskId);
        if (task) {
          task.status = 'completed';
          task.buffer = pdfBuffer;
        }
      })
      .catch((error) => {
        debugLogger.error('[PDFController]', `PDF task ${taskId} failed:`, error);
        const task = pdfTaskStore.get(taskId);
        if (task) {
          task.status = 'failed';
          task.error = error.message;
        }
      });

    return res.status(202).json({
      success: true,
      message: 'PDF generation started',
      taskId,
    });
  } catch (error) {
    debugLogger.error('[PDFController]', 'Error queuing PDF task:', error);
    next(new AppError('Failed to queue PDF generation', 500));
  }
};

export const getPdfStatus = (req, res) => {
  const { taskId } = req.params;
  const task = pdfTaskStore.get(taskId);

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found or expired' });
  }

  res.json({
    success: true,
    status: task.status,
    error: task.error
  });
};

export const downloadPdfTask = (req, res, next) => {
  const { taskId } = req.params;
  const task = pdfTaskStore.get(taskId);

  if (!task || task.status !== 'completed' || !task.buffer) {
    return res.status(404).json({ success: false, message: 'PDF not ready or expired' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="document.pdf"`);
  res.setHeader('Content-Length', task.buffer.length);
  
  res.end(task.buffer);
  
  // Clean up after download to save memory
  pdfTaskStore.delete(taskId);
};


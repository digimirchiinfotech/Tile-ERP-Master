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

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const getDirSize = async (dir) => {
  let sizes = {
    PDF: 0,
    Excel: 0,
    Images: 0,
    QCAttachments: 0,
    Documents: 0,
    Database: 0,
    Other: 0,
    Total: 0
  };

  async function calculateSize(directory) {
    try {
      const files = await readdir(directory);
      for (const file of files) {
        const filePath = path.join(directory, file);
        const fileStat = await stat(filePath);

        if (fileStat.isDirectory()) {
          await calculateSize(filePath);
        } else {
          const size = fileStat.size;
          sizes.Total += size;
          const ext = path.extname(file).toLowerCase();

          if (['.pdf'].includes(ext)) {
            sizes.PDF += size;
          } else if (['.xls', '.xlsx', '.csv'].includes(ext)) {
            sizes.Excel += size;
          } else if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
            sizes.Images += size;
          } else if (['.doc', '.docx', '.txt'].includes(ext)) {
            sizes.Documents += size;
          } else {
            sizes.Other += size;
          }
        }
      }
    } catch (err) {
      // Ignore if directory doesn't exist
      if (err.code !== 'ENOENT') {
        console.error('Error reading directory:', err);
      }
    }
  }

  await calculateSize(dir);
  return sizes;
};

export const getStorageStats = async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../', env.upload?.dir || 'uploads');
    const sizes = await getDirSize(uploadsDir);
    
    // Total limit 10GB
    const limitBytes = 10 * 1024 * 1024 * 1024;
    
    try {
      const dbRes = await req.db.query('SELECT pg_database_size(current_database()) AS db_size');
      if (dbRes.rows.length > 0) {
        sizes.Database = parseInt(dbRes.rows[0].db_size, 10);
        sizes.Total += sizes.Database;
      }
    } catch (e) {
      console.error('Error fetching database size:', e);
      sizes.Database = 0;
    }

    const qcAttachmentsSize = Math.floor(sizes.Images * 0.1);
    sizes.Images -= qcAttachmentsSize;
    sizes.QCAttachments = qcAttachmentsSize;

    const toGB = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2);
    
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0.00 MB';
      const gb = bytes / (1024 * 1024 * 1024);
      if (gb < 1) {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      }
      return gb.toFixed(2) + ' GB';
    };

    res.status(200).json({
      success: true,
      data: {
        used: toGB(sizes.Total),
        limit: 10,
        remaining: toGB(limitBytes - sizes.Total),
        details: [
          { type: 'Database', size: formatBytes(sizes.Database), color: 'secondary', percent: ((sizes.Database / limitBytes) * 100).toFixed(1) },
          { type: 'PDF', size: formatBytes(sizes.PDF), color: 'danger', percent: ((sizes.PDF / limitBytes) * 100).toFixed(1) },
          { type: 'Excel', size: formatBytes(sizes.Excel), color: 'success', percent: ((sizes.Excel / limitBytes) * 100).toFixed(1) },
          { type: 'Images', size: formatBytes(sizes.Images), color: 'info', percent: ((sizes.Images / limitBytes) * 100).toFixed(1) },
          { type: 'QC Attachments', size: formatBytes(sizes.QCAttachments), color: 'warning', percent: ((sizes.QCAttachments / limitBytes) * 100).toFixed(1) },
          { type: 'Documents', size: formatBytes(sizes.Documents), color: 'primary', percent: ((sizes.Documents / limitBytes) * 100).toFixed(1) },
        ]
      }
    });
  } catch (error) {
    console.error('Storage stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve storage stats' });
  }
};

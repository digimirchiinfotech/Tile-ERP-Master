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
    const uploadsDir = path.join(__dirname, '../../uploads');
    const sizes = await getDirSize(uploadsDir);
    
    // Total limit 10GB
    const limitBytes = 10 * 1024 * 1024 * 1024;
    
    const qcAttachmentsSize = Math.floor(sizes.Images * 0.1);
    sizes.Images -= qcAttachmentsSize;
    sizes.QCAttachments = qcAttachmentsSize;

    const toGB = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2);

    res.status(200).json({
      success: true,
      data: {
        used: toGB(sizes.Total),
        limit: 10,
        remaining: toGB(limitBytes - sizes.Total),
        details: [
          { type: 'PDF', size: toGB(sizes.PDF) + ' GB', color: 'danger', percent: ((sizes.PDF / limitBytes) * 100).toFixed(1) },
          { type: 'Excel', size: toGB(sizes.Excel) + ' GB', color: 'success', percent: ((sizes.Excel / limitBytes) * 100).toFixed(1) },
          { type: 'Images', size: toGB(sizes.Images) + ' GB', color: 'info', percent: ((sizes.Images / limitBytes) * 100).toFixed(1) },
          { type: 'QC Attachments', size: toGB(sizes.QCAttachments) + ' GB', color: 'warning', percent: ((sizes.QCAttachments / limitBytes) * 100).toFixed(1) },
          { type: 'Documents', size: toGB(sizes.Documents) + ' GB', color: 'primary', percent: ((sizes.Documents / limitBytes) * 100).toFixed(1) },
        ]
      }
    });
  } catch (error) {
    console.error('Storage stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve storage stats' });
  }
};

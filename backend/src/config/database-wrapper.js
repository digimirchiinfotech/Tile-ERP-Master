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

import dotenv from 'dotenv';
import database from './database.js';

dotenv.config();

// Set global reference
global.pgDb = database;

// Re-export database functions
export const { query, getClient } = database;
export default database;

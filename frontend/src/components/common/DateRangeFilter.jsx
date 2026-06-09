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

import { useState } from 'react';
import { ButtonGroup, Button, Form } from 'react-bootstrap';
import { Calendar } from 'lucide-react';
import '../shared/FilterSection.css';

export function filterByDateRange(items, startDate, endDate, dateField = 'created_at') {
  if (!startDate && !endDate) return items;
  return items.filter(item => {
    const raw = item[dateField] || item.created_at;
    if (!raw) return false;
    const itemDate = new Date(raw);
    if (isNaN(itemDate.getTime())) return false;
    const d = itemDate.toLocaleDateString('en-CA');
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });
}

function DateRangeFilter({ onFilterChange }) {
  const [activePreset, setActivePreset] = useState('All');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const toDateStr = (date) => date.toLocaleDateString('en-CA');

  const handlePreset = (preset) => {
    setActivePreset(preset);
    setCustomFrom('');
    setCustomTo('');
    const today = new Date();
    let start = null;
    let end = null;

    if (preset === 'Today') {
      start = toDateStr(today);
      end = toDateStr(today);
    } else if (preset === 'This Week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      start = toDateStr(monday);
      end = toDateStr(today);
    } else if (preset === 'This Month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = toDateStr(firstDay);
      end = toDateStr(today);
    } else if (preset === 'This Quarter') {
      const quarter = Math.floor(today.getMonth() / 3);
      const firstDay = new Date(today.getFullYear(), quarter * 3, 1);
      start = toDateStr(firstDay);
      end = toDateStr(today);
    }

    onFilterChange(start, end);
  };

  const handleCustomChange = (from, to) => {
    setActivePreset('Custom');
    setCustomFrom(from);
    setCustomTo(to);
    onFilterChange(from || null, to || null);
  };

  const presets = ['Today', 'This Week', 'This Month', 'This Quarter', 'All'];

  return (
    <div className="date-range-container-premium">
      <Calendar size={18} className="text-muted flex-shrink-0" />
      
      <div className="date-preset-group">
        {presets.map(p => (
          <button
            key={p}
            type="button"
            className={`date-preset-btn ${activePreset === p ? 'active' : ''}`}
            onClick={() => handlePreset(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="custom-date-inputs">
        <input
          type="date"
          className="date-input-premium"
          value={customFrom}
          onChange={(e) => handleCustomChange(e.target.value, customTo)}
          placeholder="dd-mm-yyyy"
        />
        <input
          type="date"
          className="date-input-premium"
          value={customTo}
          onChange={(e) => handleCustomChange(customFrom, e.target.value)}
          placeholder="dd-mm-yyyy"
        />
      </div>
    </div>
  );
}

export default DateRangeFilter;

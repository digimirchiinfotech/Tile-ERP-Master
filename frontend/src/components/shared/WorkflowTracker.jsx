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

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, ShoppingCart, Package, CheckCircle, Clock,
  AlertTriangle, Ship, Truck, Clipboard, FileCheck,
  Activity, RefreshCw, User, Calendar, ClipboardCheck} from 'lucide-react';
import api from '../../services/api';

const STAGE_ICONS = {
  pi:       FileText,
  po:       ShoppingCart,
  qc:       ClipboardCheck,
  ei:       FileCheck,
  pl:       Package,
  annexure: Clipboard,
  backside: FileText,
  vgm:      Ship,
  si:       Truck,
  dispatch: CheckCircle,
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleString('en-IN', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ─────────────────── Stage Chip ─────────────────── */
function StageChip({ stage }) {
  const Icon = STAGE_ICONS[stage.key] || Clock;
  const done = stage.done;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Circle icon */}
      <div
        style={{
          width: 50, height: 50, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? '#16a34a' : '#f59e0b',
          boxShadow: done ? '0 2px 12px rgba(22,163,74,0.3)' : '0 2px 12px rgba(245,158,11,0.25)',
          marginBottom: 6, flexShrink: 0,
        }}
      >
        <Icon size={20} color="#fff" />
      </div>

      {/* Stage label — fixed 2-line height so all chips align */}
      <span style={{
        fontSize: 11, fontWeight: 700, textAlign: 'center', color: '#374151',
        lineHeight: 1.2, marginBottom: 4, minHeight: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {stage.label}
      </span>

      {/* Done / Pending badge */}
      <span style={{
        fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
        background: done ? '#dcfce7' : '#fef3c7',
        color: done ? '#15803d' : '#b45309',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
      }}>
        {done ? 'Done' : 'Pending'}
      </span>

      {/* Info card — only render when there is real content */}
      {(stage.doc_no || stage.extra || (stage.who_done && stage.who_done !== 'System') || stage.done_date) && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
          padding: '5px 7px', width: '100%', fontSize: 10, color: '#475569',
          lineHeight: 1.6,
        }}>
          {stage.doc_no && (
            <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 2, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stage.doc_no}
            </div>
          )}
          {stage.extra && (
            <div style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
              marginBottom: 2,
              background: stage.extra === 'Passed' ? '#dcfce7' : stage.extra === 'Failed' ? '#fee2e2' : '#fef3c7',
              color: stage.extra === 'Passed' ? '#15803d' : stage.extra === 'Failed' ? '#b91c1c' : '#b45309',
              display: 'inline-block',
            }}>
              {stage.extra}
            </div>
          )}
          {stage.who_done && stage.who_done !== 'System' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
              <User size={9} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stage.who_done}
              </span>
            </div>
          )}
          {stage.done_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#64748b' }}>
              <Calendar size={9} style={{ flexShrink: 0 }} />
              <span>{formatDateShort(stage.done_date)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── WorkflowTracker ─────────────────── */
function WorkflowTracker({ piNumber }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!piNumber) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/workflows/pi/${encodeURIComponent(piNumber)}/full-status`);
      setData(res.data?.data || res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load workflow status.');
    } finally {
      setLoading(false);
    }
  }, [piNumber]);

  useEffect(() => { load(); }, [load]);

  /* Loading */
  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div className="spinner-border text-primary" role="status" style={{ width: 34, height: 34 }} />
      <p style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>Loading workflow data…</p>
    </div>
  );

  /* Error */
  if (error) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ef4444' }}>
      <AlertTriangle size={34} />
      <p style={{ marginTop: 8, fontSize: 14 }}>{error}</p>
      <button onClick={load} style={{
        marginTop: 10, padding: '6px 16px', borderRadius: 6,
        border: '1px solid #ef4444', background: 'transparent',
        color: '#ef4444', cursor: 'pointer', fontSize: 13,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );

  if (!data) return null;

  const {
    stages = [], overallProgress = 0, nextAction = '',
    auditLogs = [], completedCount = 0, totalStages = 9,
  } = data;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Progress Bar ── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Workflow Progress</span>
          <span style={{
            background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 800,
            borderRadius: 99, padding: '3px 12px',
          }}>
            {overallProgress}% COMPLETE
          </span>
        </div>
        <div style={{ background: '#e2e8f0', borderRadius: 99, height: 12, overflow: 'hidden' }}>
          <div style={{
            width: `${overallProgress}%`, height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #10b981)',
            borderRadius: 99, transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Next Action: <strong style={{ color: '#1e293b' }}>{nextAction}</strong>
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{completedCount}/{totalStages} stages done</span>
        </div>
      </div>

      {/* ── 10-Stage Grid — strict 5 columns × 2 rows ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '16px 10px',
        marginBottom: 28,
        padding: '14px 0',
        borderTop: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9',
      }}>
        {stages.map(stage => <StageChip key={stage.key} stage={stage} />)}
      </div>

      {/* ── Activity Audit Log ── */}
      <div>
        <h6 style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 14,
        }}>
          <Activity size={16} color="#3b82f6" /> Activity Audit Log
        </h6>

        {auditLogs.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
            No audit activity recorded yet.
          </p>
        ) : (
          <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 8, paddingLeft: 16 }}>
            {auditLogs.map((log, idx) => (
              <div key={idx} style={{ position: 'relative', marginBottom: 18 }}>
                {/* dot */}
                <div style={{
                  position: 'absolute', left: -22, top: 4,
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#3b82f6', border: '2px solid #fff',
                  boxShadow: '0 0 0 2px #3b82f6',
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Action label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        {log.action}
                      </span>
                      {log.doc_no && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 7px',
                          borderRadius: 4, background: '#eff6ff', color: '#2563eb',
                        }}>
                          {log.doc_no}
                        </span>
                      )}
                    </div>

                    {/* Who + full date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                        <User size={11} />
                        {log.user_name || 'System'}
                      </span>
                      {log.created_at && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                          <Calendar size={11} />
                          {formatDate(log.created_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Relative time */}
                  <span style={{
                    fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap',
                    marginTop: 2, flexShrink: 0,
                  }}>
                    {formatRelativeTime(log.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowTracker;

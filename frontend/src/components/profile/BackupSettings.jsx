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

import { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Form, Button, Table, Spinner, Badge, OverlayTrigger, Tooltip, Modal, Alert } from 'react-bootstrap';
import { Database, Download, Trash2, Clock, PlayCircle, Settings, Upload, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import api from '../../services/api';
import { showSuccess, showError } from '../shared/NotificationManager';

function BackupSettings({ currentUser }) {
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const apiPrefix = isSuperAdmin ? '/backups' : '/tenant-backups';
  const [settings, setSettings] = useState({ auto_backup_enabled: false, backup_frequency: 'Weekly', retention_count: 3 });
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isTakingBackup, setIsTakingBackup] = useState(false);
  
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const fileInputRef = useRef(null);

  const fetchSettingsAndBackups = async () => {
    try {
      setLoading(true);
      const promises = [api.get(`${apiPrefix}/list`)];
      
      if (isSuperAdmin) {
        promises.push(api.get('/backups/settings'));
      }
      
      const results = await Promise.all(promises);
      const backupsRes = results[0];
      
      if (backupsRes.data?.success) setBackups(backupsRes.data.data);
      
      if (isSuperAdmin && results[1]?.data?.success) {
        setSettings(results[1].data.data);
      }
    } catch (err) {
      showError('Failed to load backup data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndBackups();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await api.put('/backups/settings', settings);
      if (res.data?.success) showSuccess('Backup settings saved successfully');
    } catch (err) {
      showError('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTakeBackup = async () => {
    try {
      setIsTakingBackup(true);
      const res = await api.post(`${apiPrefix}/create`);
      if (res.data?.success) {
        showSuccess('Manual backup created successfully');
        fetchSettingsAndBackups();
      }
    } catch (err) {
      showError('Failed to create backup');
    } finally {
      setIsTakingBackup(false);
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;
    try {
      const res = await api.delete(`${apiPrefix}/${filename}`);
      if (res.data?.success) {
        showSuccess('Backup deleted');
        fetchSettingsAndBackups();
      }
    } catch (err) {
      showError('Failed to delete backup');
    }
  };
  
  const handleDownload = async (filename) => {
    try {
      const response = await api.get(`${apiPrefix}/download/${filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError('Failed to download backup file');
    }
  };

  const handleRestoreClick = (file) => {
    setRestoreFile(file);
    setShowRestoreModal(true);
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        showError('Please upload a valid .zip backup file');
        return;
      }
      setRestoreFile({ name: file.name, fileObj: file, type: 'upload' });
      setShowRestoreModal(true);
    }
    e.target.value = null; // reset
  };

  const confirmRestore = async () => {
    try {
      setIsRestoring(true);
      
      const formData = new FormData();
      if (restoreFile.type === 'upload') {
        formData.append('file', restoreFile.fileObj);
      } else {
        formData.append('filename', restoreFile.name);
      }
      
      const res = await api.post('/backups/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data?.success) {
        showSuccess('System restored successfully. A safety snapshot was also created.');
        setShowRestoreModal(false);
        fetchSettingsAndBackups();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Restore failed');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="backup-settings">
      <Row className="g-4">
        {isSuperAdmin && (
          <Col md={12}>
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <Settings size={18} className="text-primary" /> Backup & Restore Configuration
                </h6>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="d-flex align-items-center"
                  onClick={handleTakeBackup} 
                  disabled={isTakingBackup}
                >
                  {isTakingBackup ? <Spinner size="sm" className="me-2" /> : <Database size={14} className="me-2" />}
                  Create Backup Now
                </Button>
              </Card.Header>
              <Card.Body>
              <Form>
                <div className="mb-4">
                  <Form.Check
                    type="switch"
                    id="auto-backup"
                    label={<span className="fw-bold">Automated System Backups</span>}
                    checked={settings.auto_backup_enabled}
                    onChange={(e) => setSettings({ ...settings, auto_backup_enabled: e.target.checked })}
                    className="mb-1"
                  />
                  <Form.Text className="text-muted ms-5">
                    Automatically create regular backups of the entire system database and uploaded files.
                  </Form.Text>
                </div>

                {settings.auto_backup_enabled && (
                  <Row className="g-3 mb-4 ms-4">
                    <Col md={5}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Backup Frequency</Form.Label>
                        <Form.Select 
                          value={settings.backup_frequency}
                          onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
                        >
                          <option value="Daily">Daily (2:00 AM)</option>
                          <option value="Weekly">Weekly (Sunday 2:00 AM)</option>
                          <option value="Monthly">Monthly (1st at 2:00 AM)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={5}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Retention Count</Form.Label>
                        <Form.Select 
                          value={settings.retention_count}
                          onChange={(e) => setSettings({ ...settings, retention_count: parseInt(e.target.value, 10) })}
                        >
                          <option value={1}>Keep last 1</option>
                          <option value={3}>Keep last 3</option>
                          <option value={5}>Keep last 5</option>
                          <option value={10}>Keep last 10</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                <div className="mt-4">
                  <Button 
                    variant="primary" 
                    onClick={handleSaveSettings} 
                    disabled={savingSettings}
                  >
                    {savingSettings ? <Spinner size="sm" className="me-2" /> : <Settings size={14} className="me-2" />}
                    Save Configuration
                  </Button>
                </div>
              </Form>
              </Card.Body>
            </Card>
          </Col>
        )}

        <Col md={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Clock size={18} className="text-primary" /> Backup History
              </h6>
              <div className="d-flex gap-2">
                {isSuperAdmin && (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="d-none" 
                      accept=".zip" 
                      onChange={handleFileChange} 
                    />
                    <Button variant="outline-primary" size="sm" className="d-flex align-items-center" onClick={handleUploadClick}>
                      <Upload size={14} className="me-1"/> Upload Backup
                    </Button>
                  </>
                )}
                {!isSuperAdmin && (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="d-flex align-items-center"
                    onClick={handleTakeBackup} 
                    disabled={isTakingBackup}
                  >
                    {isTakingBackup ? <Spinner size="sm" className="me-2" /> : <Database size={14} className="me-2" />}
                    Create Backup Now
                  </Button>
                )}
                <Button variant="light" size="sm" onClick={fetchSettingsAndBackups} disabled={loading} title="Refresh">
                  <RotateCcw size={14} className={loading ? 'spin text-primary' : 'text-primary'} />
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
              ) : backups.length === 0 ? (
                <div className="text-center p-5 text-muted">
                  <Database size={48} className="mb-3 opacity-25" />
                  <h5>No Backups Found</h5>
                  <p>Create a manual backup or enable auto-backups.</p>
                </div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-4 py-3">File Name</th>
                      <th>Date & Time</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th className="text-end px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b, i) => (
                      <tr key={i} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="d-flex align-items-center gap-2">
                            <Database size={16} className="text-muted" />
                            <span className="fw-medium text-dark">{b.name}</span>
                          </div>
                        </td>
                        <td>{new Date(b.createdAt).toLocaleString()}</td>
                        <td>{formatBytes(b.size)}</td>
                        <td>
                          <Badge bg="success" className="bg-opacity-10 text-success border border-success px-2 py-1">
                            {b.status}
                          </Badge>
                        </td>
                        <td className="text-end px-4 py-2">
                          <OverlayTrigger overlay={<Tooltip>Download Backup</Tooltip>}>
                            <Button variant="light" size="sm" className="me-2 text-primary" onClick={() => handleDownload(b.name)}>
                              <Download size={14} />
                            </Button>
                          </OverlayTrigger>
                          {isSuperAdmin && (
                            <>
                              <OverlayTrigger overlay={<Tooltip>Restore System</Tooltip>}>
                                <Button variant="light" size="sm" className="me-2 text-warning" onClick={() => handleRestoreClick(b)}>
                                  <RotateCcw size={14} />
                                </Button>
                              </OverlayTrigger>
                              <OverlayTrigger overlay={<Tooltip>Delete Backup</Tooltip>}>
                                <Button variant="light" size="sm" className="text-danger" onClick={() => handleDeleteBackup(b.name)}>
                                  <Trash2 size={14} />
                                </Button>
                              </OverlayTrigger>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Restore Confirmation Modal */}
      <Modal show={showRestoreModal} onHide={() => !isRestoring && setShowRestoreModal(false)} backdrop="static" centered>
        <Modal.Header closeButton={!isRestoring} className="bg-danger text-white">
          <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
            <AlertTriangle size={20} /> Critical Action: System Restore
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="text-center mb-4">
            <Database size={48} className="text-danger mb-3" />
            <h5>Confirm System Restore</h5>
            <p className="text-muted">You are about to restore the system using:</p>
            <Badge bg="light" text="dark" className="fs-6 p-2 border border-danger">
              {restoreFile?.name}
            </Badge>
          </div>
          
          <Alert variant="warning" className="mb-0 d-flex align-items-start gap-2">
            <AlertTriangle size={24} className="mt-1 flex-shrink-0" />
            <div>
              <strong>Warning:</strong> Restoring will overwrite the current database and file system with the backup data. Any changes made after the backup was taken will be lost.
              <br/><br/>
              A safety snapshot will be taken automatically before the restore begins.
            </div>
          </Alert>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowRestoreModal(false)} disabled={isRestoring}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmRestore} disabled={isRestoring}>
            {isRestoring ? (
              <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2"/> Restoring System...</>
            ) : (
              <><RotateCcw size={16} className="me-2"/> Yes, Restore Now</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default BackupSettings;

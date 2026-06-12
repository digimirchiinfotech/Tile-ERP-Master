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

import React, { useState, useEffect } from 'react';
import { Form, Modal, Button, InputGroup, Spinner, Badge, Dropdown } from 'react-bootstrap';
import { Plus, X, Image as ImageIcon, Search } from 'lucide-react';
import api from '../../services/api.js';
import { uploadMasterDataImage } from '../../services/masterDataService.js';

// Custom Menu to prevent React-Bootstrap from hijacking keyboard events
const CustomMenu = React.forwardRef(
  ({ children, style, className, 'aria-labelledby': labeledBy, searchTerm, setSearchTerm, addButtonLabel, handleChange }, ref) => {
    return (
      <div
        ref={ref}
        style={{ ...style, maxHeight: '300px', overflowY: 'auto' }}
        className={`w-100 shadow-sm ${className}`}
        aria-labelledby={labeledBy}
      >
        <div className="px-2 py-1 position-sticky top-0 bg-white" style={{ zIndex: 1 }}>
          <div className="position-relative">
            <Search size={14} className="position-absolute top-50 translate-middle-y text-muted ms-2" />
            <Form.Control
              autoFocus
              className="ps-4 border-primary-subtle"
              placeholder="Type to search..."
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
              style={{ borderRadius: '6px' }}
              onKeyDown={(e) => e.stopPropagation()} // Crucial: Stop Dropdown from eating keystrokes!
            />
          </div>
        </div>
        <Dropdown.Divider className="my-1" />
        <Dropdown.Item 
          onClick={() => handleChange({ target: { value: '__add_new__' } })}
          className="text-primary fw-bold"
        >
          {addButtonLabel}
        </Dropdown.Item>
        {children}
      </div>
    );
  },
);

function AddableDropdown({
  value,
  onChange,
  placeholder = 'Select...',
  masterDataType,
  options: staticOptions = [],
  isInvalid = false,
  disabled = false,
  required = false,
  isMultiple = false,
  validateFunction = null,
  addButtonLabel = '+ Create',
  label,
  className = '',
  selectClassName = '',
  selectStyle = {},
  extraBodyData = {},
  numbersOnly = false,
  allowImageUpload = false,
  disableAutoFetch = false,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (Array.isArray(staticOptions) && staticOptions.length > 0) {
      setOptions(staticOptions);
    } else if (masterDataType && (!Array.isArray(staticOptions) || staticOptions.length === 0) && !disableAutoFetch) {
      fetchOptions();
    } else if (Array.isArray(staticOptions)) {
      setOptions(staticOptions);
    } else {
      setOptions([]);
    }
  }, [masterDataType, JSON.stringify(staticOptions)]);

  const fetchOptions = async () => {
    if (!masterDataType) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/master-data/${masterDataType}`);
      if (response.data.success) {
        const values = response.data.data.map(item => 
          typeof item === 'string' ? item : (item.value || item.name || item.portName || item.countryName)
        );
        setOptions([...new Set(values.filter(Boolean))]);
      }
    } catch (err) {
      console.error(`Failed to fetch ${masterDataType}:`, err);
      if (staticOptions.length > 0) {
        setOptions(staticOptions);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === '__add_new__') {
      setShowAddModal(true);
      setNewValue('');
      setError('');
      setImageUrl(null);
    } else if (selectedValue) {
      if (isMultiple) {
        const currentValues = Array.isArray(value) ? value : [];
        if (!currentValues.includes(selectedValue)) {
          onChange([...currentValues, selectedValue]);
        }
      } else {
        onChange(selectedValue);
      }
    }
  };

  const handleRemove = (valToRemove) => {
    if (isMultiple) {
      const currentValues = Array.isArray(value) ? value : [];
      onChange(currentValues.filter(v => v !== valToRemove));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Only JPG, JPEG, PNG, and WEBP formats are supported');
      return;
    }

    setUploadingImage(true);
    setError('');
    try {
      const uploadedUrl = await uploadMasterDataImage(file);
      setImageUrl(uploadedUrl);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload image');
      console.error('Image upload error:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateNew = async () => {
    const trimmedValue = newValue.trim();
    if (!trimmedValue) {
      setError('Please enter a value');
      return;
    }

    if (options.some(opt => opt.toLowerCase() === trimmedValue.toLowerCase())) {
      setError('This value already exists');
      return;
    }

    if (validateFunction) {
      const validationError = validateFunction(trimmedValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setAdding(true);
    setError('');

    try {
      if (masterDataType) {
        const payload = {
          value: trimmedValue,
          ...extraBodyData
        };

        if (allowImageUpload && imageUrl) {
          payload.imageUrl = imageUrl;
        }

        const response = await api.post(`/master-data/${masterDataType}`, payload);
        
        if (response.data.success) {
          await fetchOptions();
          if (isMultiple) {
            const currentValues = Array.isArray(value) ? value : [];
            onChange([...currentValues, trimmedValue]);
          } else {
            onChange(trimmedValue);
          }
          setShowAddModal(false);
          setNewValue('');
          setImageUrl(null);
        } else {
          setError(response.data.message || 'Failed to add new value');
        }
      } else {
        setOptions(prev => [...prev, trimmedValue]);
        if (isMultiple) {
          const currentValues = Array.isArray(value) ? value : [];
          onChange([...currentValues, trimmedValue]);
        } else {
          onChange(trimmedValue);
        }
        setShowAddModal(false);
        setNewValue('');
        setImageUrl(null);
      }
    } catch (err) {
      console.error('Failed to add new value:', err);
      setError(err.response?.data?.message || 'Failed to add new value');
    } finally {
      setAdding(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !uploadingImage) {
      e.preventDefault();
      handleCreateNew();
    }
  };

  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

  const displayedOptions = [...options];
  if (value) {
    const vals = Array.isArray(value) ? value : [value];
    for (let i = vals.length - 1; i >= 0; i--) {
      const valStr = String(vals[i]);
      if (valStr && !displayedOptions.some(opt => String(opt).toLowerCase() === valStr.toLowerCase())) {
        displayedOptions.unshift(valStr);
      }
    }
  }

  const filteredOptions = displayedOptions.filter(opt => 
    String(opt).toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 100);

  const displayValue = isMultiple 
    ? (loading ? 'Loading...' : placeholder)
    : (displayedOptions.find(opt => String(opt).toLowerCase() === String(value).toLowerCase()) || value || (loading ? 'Loading...' : placeholder));

  return (
    <>
      <div className={className}>
        <Dropdown 
          onToggle={(isOpen) => {
            if (!isOpen) setSearchTerm('');
          }}
        >
          <Dropdown.Toggle
            variant="outline-secondary"
            className={`w-100 text-start d-flex justify-content-between align-items-center mb-1 ${selectClassName} ${isInvalid ? 'is-invalid border-danger' : ''}`}
            style={{ ...selectStyle, backgroundColor: '#fff', borderColor: '#dee2e6' }}
            disabled={disabled || loading}
          >
            <span className="text-truncate">{displayValue}</span>
          </Dropdown.Toggle>

          <Dropdown.Menu 
            as={CustomMenu} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            addButtonLabel={addButtonLabel} 
            handleChange={handleChange}
          >
            {filteredOptions.map((option) => (
              <Dropdown.Item 
                key={option} 
                active={String(option).toLowerCase() === String(value).toLowerCase()}
                onClick={() => handleChange({ target: { value: option } })}
              >
                {option}
              </Dropdown.Item>
            ))}
            {filteredOptions.length === 0 && (
              <Dropdown.Item disabled className="text-muted text-center fst-italic">
                No matching options found
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown>

        {isMultiple && selectedValues.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mt-1">
            {selectedValues.map((val) => (
              <Badge 
                key={val} 
                bg="primary" 
                className="d-flex align-items-center gap-1 p-2"
                style={{ borderRadius: '6px', fontWeight: '500' }}
              >
                {val}
                {!disabled && (
                  <X 
                    size={14} 
                    className="cursor-pointer" 
                    onClick={() => handleRemove(val)}
                  />
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); setImageUrl(null); }} centered size="sm">
        <Modal.Header closeButton className="py-2">
          <Modal.Title className="fs-6">Create {label || 'Value'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label className="small text-muted mb-1">Enter new {label?.toLowerCase() || 'value'}</Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                value={newValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewValue(numbersOnly ? val.replace(/\D/g, '') : val.toUpperCase());
                }}
                onKeyPress={handleKeyPress}
                placeholder={`e.g. ${label || 'Value'}`}
                isInvalid={!!error}
                autoFocus
                size="sm"
              />
            </InputGroup>

            {allowImageUpload && (
              <div className="mt-3">
                <Form.Label className="small text-muted mb-1 d-flex align-items-center">
                  <ImageIcon size={14} className="me-1" />
                  Image (Optional)
                </Form.Label>
                <div className="d-flex align-items-start gap-2">
                  <div className="flex-grow-1">
                    <Form.Control
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleImageUpload}
                      disabled={uploadingImage || adding}
                      size="sm"
                      className="form-control-enhanced"
                    />
                    <Form.Text className="text-muted small">Max 5MB (JPG, PNG, WEBP)</Form.Text>
                  </div>
                  {imageUrl && (
                    <div className="position-relative" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #dee2e6' }} 
                      />
                      <Badge 
                        bg="danger" 
                        className="position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center cursor-pointer"
                        style={{ top: '-5px', right: '-5px', width: '16px', height: '16px' }}
                        onClick={() => setImageUrl(null)}
                      >
                        <X size={10} />
                      </Badge>
                    </div>
                  )}
                </div>
                {uploadingImage && <div className="small text-primary mt-1"><Spinner size="sm" animation="border" className="me-1" /> Uploading image...</div>}
              </div>
            )}

            {error && (
              <Form.Text className="text-danger small d-block mt-1">{error}</Form.Text>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="py-1">
          <Button 
            variant="light" 
            size="sm" 
            onClick={() => { setShowAddModal(false); setImageUrl(null); }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleCreateNew}
            disabled={adding || uploadingImage || !newValue.trim()}
          >
            {adding ? (
              <>
                <Spinner size="sm" animation="border" className="me-1" />
                Adding...
              </>
            ) : (
              <>
                <Plus size={14} className="me-1" />
                Add
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .cursor-pointer { cursor: pointer; }
      `}} />
    </>
  );
}

export default AddableDropdown;

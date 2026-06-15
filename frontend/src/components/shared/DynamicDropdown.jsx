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
import { Form, Button, Modal, InputGroup } from 'react-bootstrap';
import { Plus, X, AlertCircle } from 'lucide-react';
import { restrictToSpecificationChars } from '../../utils/inputHelpers.js';

function DynamicDropdown({
  value,
  onChange,
  options = [],
  onAddNew,
  placeholder = 'Select option',
  isMultiple = false,
  isInvalid = false,
  example = '',
  validationType = null,
  validateFunction = null,
  addModalTitle = 'Create Option',
  addModalLabel = 'Enter new value',
  addButtonLabel = '+ Create'
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleCreateNew = () => {
    const trimmedValue = newValue.trim();
    
    if (!trimmedValue) {
      setValidationError('Value cannot be empty');
      return;
    }

    if (options.includes(trimmedValue)) {
      setValidationError('This option already exists');
      return;
    }

    // Validate using custom validation function if provided
    if (validateFunction) {
      const error = validateFunction(trimmedValue);
      if (error) {
        setValidationError(error);
        return;
      }
    }

    setValidationError('');
    onAddNew(trimmedValue);
    setNewValue('');
    setShowAddModal(false);

    if (isMultiple) {
      const currentValues = Array.isArray(value) ? value : [];
      onChange([...currentValues, trimmedValue]);
    } else {
      onChange(trimmedValue);
    }
  };

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;

    if (selectedValue === '__add_new__') {
      setShowAddModal(true);
      return;
    }

    if (isMultiple) {
      const currentValues = Array.isArray(value) ? value : [];
      if (!currentValues.includes(selectedValue) && selectedValue) {
        onChange([...currentValues, selectedValue]);
      }
    } else {
      onChange(selectedValue);
    }
  };

  const removeValue = (valueToRemove) => {
    if (isMultiple) {
      const newValues = value.filter((v) => v !== valueToRemove);
      onChange(newValues);
    }
  };

  return (
    <>
      <div className="dynamic-dropdown">
        <Form.Select
          value={isMultiple ? '' : value}
          onChange={handleSelectChange}
          isInvalid={isInvalid}
          className="mb-2"
        >
          <option value="">{placeholder}</option>
          {!isMultiple && value && !options.includes(value) && (
             <option value={typeof value === 'object' ? (value.value || value.id || JSON.stringify(value)) : value}>
               {typeof value === 'object' ? (value.countryName || value.portName || value.name || value.label || value.value || 'Selected') : value}
             </option>
          )}
          {options.filter(option => {
            const keyValue = typeof option === 'object' && option !== null ? (option.value || option.id || option.countryName || option.portName || option.name || option.label) : option;
            if (value === keyValue || (isMultiple && Array.isArray(value) && value.includes(keyValue))) return true;
            if (typeof option === 'object' && option !== null && typeof option.status === 'string' && option.status.toLowerCase() === 'inactive') return false;
            return true;
          }).map((option, index) => {
            const displayValue = typeof option === 'object' && option !== null 
              ? (option.countryName || option.portName || option.name || option.label || option.value || 'Unnamed Option') 
              : option;
            const keyValue = typeof option === 'object' && option !== null
              ? (option.value || option.id || displayValue)
              : option;
              
            return (
              <option key={index} value={keyValue}>
                {displayValue}
              </option>
            );
          })}
          <option value="__add_new__" className="text-primary fw-bold">
            {addButtonLabel}
          </option>
        </Form.Select>

        {isMultiple && Array.isArray(value) && value.length > 0 && (
          <div className="selected-values mt-2">
            {value.map((val, index) => (
              <span key={index} className="badge bg-primary me-1 mb-1 d-inline-flex align-items-center">
                {val}
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 ms-1 text-white"
                  onClick={() => removeValue(val)}
                  style={{ border: 'none', background: 'none' }}
                >
                  <X size={12} />
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); setValidationError(''); }} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-uppercase fw-bold">{addModalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {validationError && (
            <div className="alert alert-danger d-flex align-items-start mb-3" role="alert">
              <AlertCircle size={18} className="me-2 mt-1 flex-shrink-0" />
              <div>
                <strong>Invalid format:</strong> {validationError}
              </div>
            </div>
          )}
          <Form.Group>
            <Form.Label>{addModalLabel}</Form.Label>
            <Form.Control
              type="text"
              value={newValue}
              onChange={(e) => {
                setNewValue(restrictToSpecificationChars(e.target.value));
                setValidationError('');
              }}
              placeholder={example || "Enter new option (numbers, letters, spaces, . *)"}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateNew();
                }
              }}
              autoFocus
              isInvalid={!!validationError}
            />
            {validationType === 'thickness' && (
              <Form.Text className="text-muted d-block mt-2">
                Format: 8 mm or 1.2 cm (must include unit: mm or cm)
              </Form.Text>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowAddModal(false); setValidationError(''); }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateNew}
            disabled={!newValue.trim()}
          >
            <Plus size={16} className="me-1" />
            Create
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .dynamic-dropdown .selected-values .badge {
          font-size: 0.875rem;
          padding: 0.5rem 0.75rem;
        }

        .dynamic-dropdown .selected-values .badge button {
          border: none;
          background: none;
          color: inherit;
          padding: 0;
          margin-left: 0.25rem;
        }

        .dynamic-dropdown .selected-values .badge button:hover {
          opacity: 0.8;
        }
      `}</style>
    </>
  );
}

export default DynamicDropdown;





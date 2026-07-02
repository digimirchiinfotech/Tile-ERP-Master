const fs = require('fs');

const file = 'd:/Tile ERP/frontend/src/components/super-admin/CompanyForm.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add validation logic to validateStep(1)
const validateStep1Target = `      if (!formData.country) newErrors.country = 'Country is required';
    }`;

const validateStep1Replacement = `      if (!formData.country) newErrors.country = 'Country is required';

      // Bank Details validation
      const hasBankDetails = formData.bank_details && (
        formData.bank_details.accountName ||
        formData.bank_details.accountNumber ||
        formData.bank_details.bankName ||
        formData.bank_details.ifscCode ||
        formData.bank_details.swiftCode ||
        formData.bank_details.bankAddress
      );

      if (hasBankDetails) {
        if (!formData.bank_details.accountNumber) {
          newErrors['bank_details.accountNumber'] = 'Please enter a valid account number.';
        } else {
          const acc = formData.bank_details.accountNumber;
          if (!/^\\d{8,20}$/.test(acc)) {
            newErrors['bank_details.accountNumber'] = 'Please enter a valid account number.';
          }
        }
        
        if (!formData.bank_details.ifscCode) {
          newErrors['bank_details.ifscCode'] = 'Invalid IFSC/Branch Code.';
        } else {
          const countryUpper = String(formData.country || '').toUpperCase();
          const isIndia = countryUpper === 'INDIA' || countryUpper === 'IN';
          if (isIndia) {
            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_details.ifscCode)) {
              newErrors['bank_details.ifscCode'] = 'Invalid IFSC/Branch Code.';
            }
          } else {
            if (!/^[A-Z0-9]{4,15}$/.test(formData.bank_details.ifscCode)) {
              newErrors['bank_details.ifscCode'] = 'Invalid IFSC/Branch Code.';
            }
          }
        }
      }

      if (formData.bank_details?.swiftCode) {
        if (!/^([A-Z0-9]{8}|[A-Z0-9]{11})$/.test(formData.bank_details.swiftCode)) {
          newErrors['bank_details.swiftCode'] = 'Invalid SWIFT Code.';
        }
      }

      if (formData.bank_details?.bankAddress && formData.bank_details.bankAddress.length > 250) {
        newErrors['bank_details.bankAddress'] = 'Maximum 250 characters.';
      }
    }`;

content = content.replace(validateStep1Target, validateStep1Replacement);

// 2. Add onChange filtering for contactNumber
const handleInputTarget = `  const handleInputChange = (field, value) => {
    let formattedValue = value;
    if (typeof formattedValue === 'string' && uppercaseFields.includes(field)) {
      formattedValue = formattedValue.toUpperCase();
    }`;

const handleInputReplacement = `  const handleInputChange = (field, value) => {
    let formattedValue = value;
    if (typeof formattedValue === 'string') {
      if (uppercaseFields.includes(field)) {
        formattedValue = formattedValue.toUpperCase();
      }
      if (field === 'contactNumber') {
        formattedValue = formattedValue.replace(/[^0-9+]/g, '');
        if (formattedValue.indexOf('+') > 0) {
          formattedValue = formattedValue.replace(/\\+/g, (match, offset) => offset === 0 ? '+' : '');
        }
      }
    }`;

content = content.replace(handleInputTarget, handleInputReplacement);

// 3. Add isInvalid & Feedback to accountNumber
const accountNumTarget = `                              value={formData.bank_details?.accountNumber || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, accountNumber: e.target.value }
                              })}
                            />
                          </Form.Group>`;
const accountNumReplacement = `                              value={formData.bank_details?.accountNumber || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, accountNumber: e.target.value.replace(/[^0-9]/g, '') }
                              })}
                              isInvalid={!!errors['bank_details.accountNumber']}
                            />
                            <Form.Control.Feedback type="invalid">{errors['bank_details.accountNumber']}</Form.Control.Feedback>
                          </Form.Group>`;
content = content.replace(accountNumTarget, accountNumReplacement);

// 4. Add isInvalid & Feedback to ifscCode
const ifscTarget = `                              value={formData.bank_details?.ifscCode || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, ifscCode: e.target.value.toUpperCase() }
                              })}
                            />
                          </Form.Group>`;
const ifscReplacement = `                              value={formData.bank_details?.ifscCode || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, ifscCode: e.target.value.toUpperCase() }
                              })}
                              isInvalid={!!errors['bank_details.ifscCode']}
                            />
                            <Form.Control.Feedback type="invalid">{errors['bank_details.ifscCode']}</Form.Control.Feedback>
                          </Form.Group>`;
content = content.replace(ifscTarget, ifscReplacement);

// 5. Add isInvalid & Feedback to swiftCode
const swiftTarget = `                              value={formData.bank_details?.swiftCode || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, swiftCode: e.target.value.toUpperCase() }
                              })}
                            />
                          </Form.Group>`;
const swiftReplacement = `                              value={formData.bank_details?.swiftCode || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, swiftCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }
                              })}
                              isInvalid={!!errors['bank_details.swiftCode']}
                            />
                            <Form.Control.Feedback type="invalid">{errors['bank_details.swiftCode']}</Form.Control.Feedback>
                          </Form.Group>`;
content = content.replace(swiftTarget, swiftReplacement);

// 6. Add isInvalid & Feedback to bankAddress
const bankAddrTarget = `                              value={formData.bank_details?.bankAddress || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, bankAddress: e.target.value.toUpperCase() }
                              })}
                            />
                          </Form.Group>`;
const bankAddrReplacement = `                              value={formData.bank_details?.bankAddress || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bank_details: { ...formData.bank_details, bankAddress: e.target.value.toUpperCase() }
                              })}
                              isInvalid={!!errors['bank_details.bankAddress']}
                            />
                            <Form.Control.Feedback type="invalid">{errors['bank_details.bankAddress']}</Form.Control.Feedback>
                          </Form.Group>`;
content = content.replace(bankAddrTarget, bankAddrReplacement);

fs.writeFileSync(file, content);
console.log('patched CompanyForm.jsx');

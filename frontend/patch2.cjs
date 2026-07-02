const fs = require('fs');
const file = 'd:/Tile ERP/frontend/src/components/super-admin/CompanyForm.jsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `                            <Form.Control
                              type="email"
                              className="form-control-lg bg-light"
                              value={formData.adminEmailId}
                              onChange={(e) => handleInputChange('adminEmailId', e.target.value)}
                              isInvalid={!!errors.adminEmailId}
                              autoComplete="off"
                            />`;

const replacement1 = `                            <Form.Control
                              type="email"
                              name="newAdminEmailId_no_autofill"
                              id="newAdminEmailId_no_autofill"
                              className="form-control-lg bg-light"
                              value={formData.adminEmailId}
                              onChange={(e) => handleInputChange('adminEmailId', e.target.value)}
                              isInvalid={!!errors.adminEmailId}
                              autoComplete="new-password"
                            />`;

content = content.replace(target1, replacement1);

const target2 = `                            <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                className="form-control-lg bg-light"
                                value={formData.adminPassword}
                                onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                                isInvalid={!!errors.adminPassword}
                                autoComplete="new-password"
                              />`;

const replacement2 = `                            <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                name="newAdminPassword_no_autofill"
                                id="newAdminPassword_no_autofill"
                                className="form-control-lg bg-light"
                                value={formData.adminPassword}
                                onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                                isInvalid={!!errors.adminPassword}
                                autoComplete="new-password"
                              />`;

content = content.replace(target2, replacement2);

fs.writeFileSync(file, content);
console.log('patched CompanyForm.jsx');

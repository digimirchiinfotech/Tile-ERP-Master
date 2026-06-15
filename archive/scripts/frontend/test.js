// test.js
const formData = {
    name: 'Test',
    industry: 'Ceramics Manufacturing',
    contactPersonName: 'Test Name',
    emailId: 'test@example.com',
    contactNumber: '+919876543210',
    country: 'India',
    city: '',
    address: '',
    website: '',
    gstn: '',
    pan: '',
    iecNo: '',
    subscriptionPlan: 'Basic',
    status: 'Active',
    logo: null,
    enabledModules: ['reports_analytics'],
    adminUsername: 'digi',
    adminPassword: 'password123',
    adminConfirmPassword: 'password123',
    adminEmailId: 'digi@gmail.com',
};

function validateCompanyName(value) { return { isValid: true, error: null }; }
function validateFullName(value) { return { isValid: true, error: null }; }
function validateEmail(value) { return { isValid: true, error: null }; }
function validateContactNumber(value) { return { isValid: true, error: null }; }

const errors = {};
let currentStep = 3;

function validateStep(step) {
    const newErrors = {};
    if (step === 1) {
      const nameVal = validateCompanyName(formData.name);
      if (!nameVal.isValid) newErrors.name = nameVal.error;
      if (!formData.industry) newErrors.industry = 'Industry is required';
      if (!validateFullName(formData.contactPersonName).isValid) newErrors.contactPersonName = 'Valid name required';
      if (!validateEmail(formData.emailId).isValid) newErrors.emailId = 'Valid email required';
      if (!formData.contactNumber) {
        newErrors.contactNumber = 'Phone number is required';
      } else if (!validateContactNumber(formData.contactNumber).isValid) {
        newErrors.contactNumber = validateContactNumber(formData.contactNumber).error || 'Valid phone number required';
      }
      if (!formData.country) newErrors.country = 'Country is required';
    }
    if (step === 3) {
      if (!formData.adminUsername) newErrors.adminUsername = 'Username required';
      if (!validateEmail(formData.adminEmailId).isValid) newErrors.adminEmailId = 'Valid admin email required';
      if (!formData.adminPassword) newErrors.adminPassword = 'Password required';
      if (formData.adminPassword !== formData.adminConfirmPassword) newErrors.adminConfirmPassword = 'Passwords mismatch';
    }
    Object.assign(errors, newErrors);
    return Object.keys(newErrors).length === 0;
}

const step1Valid = validateStep(1);
console.log('step1Valid:', step1Valid, errors);
const step3Valid = validateStep(3);
console.log('step3Valid:', step3Valid, errors);

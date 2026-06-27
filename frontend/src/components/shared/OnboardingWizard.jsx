import React, { useState } from 'react';
import { Modal, Button, Form, ProgressBar } from 'react-bootstrap';
import { useUserContext } from '../../contexts/UserContext.jsx';
import api from '../../services/api.js';

function OnboardingWizard({ show, onComplete }) {
  const { currentUser } = useUserContext();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: currentUser?.company_name || '',
    iecNumber: '',
    lutArnNumber: '',
    gstin: '',
    productName: '',
    productSize: '',
    clientName: '',
    clientCountry: ''
  });

  const totalSteps = 5;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => setStep(step + 1);
  const handleSkip = () => setStep(step + 1);

  const handleComplete = async () => {
    try {
      setLoading(true);
      await api.patch('/companies/onboarding-complete');
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} backdrop="static" keyboard={false} size="lg" centered>
      <Modal.Header>
        <Modal.Title>Welcome to Tile ERP!</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <ProgressBar now={(step / totalSteps) * 100} label={`Step ${step} of ${totalSteps}`} />
        </div>

        {step === 1 && (
          <div>
            <h5>Step 1: Company Profile</h5>
            <p className="text-muted">Let's start by setting up your core company export details.</p>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Company Name</Form.Label>
                <Form.Control type="text" name="companyName" value={formData.companyName} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>IEC Number (Import Export Code)</Form.Label>
                <Form.Control type="text" name="iecNumber" value={formData.iecNumber} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>GSTIN</Form.Label>
                <Form.Control type="text" name="gstin" value={formData.gstin} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>LUT ARN Number (For zero-rated exports)</Form.Label>
                <Form.Control type="text" name="lutArnNumber" value={formData.lutArnNumber} onChange={handleChange} />
              </Form.Group>
            </Form>
          </div>
        )}

        {step === 2 && (
          <div>
            <h5>Step 2: Add Your First Product</h5>
            <p className="text-muted">What kind of tiles do you export?</p>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Product Name</Form.Label>
                <Form.Control type="text" name="productName" placeholder="e.g. Glazed Porcelain Tiles" value={formData.productName} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Size (mm)</Form.Label>
                <Form.Control type="text" name="productSize" placeholder="e.g. 600x1200" value={formData.productSize} onChange={handleChange} />
              </Form.Group>
            </Form>
          </div>
        )}

        {step === 3 && (
          <div>
            <h5>Step 3: Add Your First Buyer</h5>
            <p className="text-muted">Who are you exporting to?</p>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Client Name / Company</Form.Label>
                <Form.Control type="text" name="clientName" value={formData.clientName} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Country</Form.Label>
                <Form.Control type="text" name="clientCountry" value={formData.clientCountry} onChange={handleChange} />
              </Form.Group>
            </Form>
          </div>
        )}

        {step === 4 && (
          <div>
            <h5>Step 4: Create a Proforma Invoice</h5>
            <p className="text-muted">You're almost done. Once this setup is complete, you can generate a Proforma Invoice using the product and buyer you just added.</p>
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              Our export document engine automatically links PI → Export Invoice → Packing List → VGM → Shipping Instructions.
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-4">
            <h4 className="text-success mb-3"><i className="bi bi-check-circle-fill" style={{fontSize: '3rem'}}></i></h4>
            <h5>You're All Set!</h5>
            <p className="text-muted">Your workspace is ready. Let's start exporting.</p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {step > 1 && step < 5 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={loading}>
            Back
          </Button>
        )}
        {step < 5 && (
          <Button variant="outline-secondary" onClick={handleSkip} disabled={loading} className="me-auto">
            Skip for now
          </Button>
        )}
        {step < 5 ? (
          <Button variant="primary" onClick={handleNext} disabled={loading}>
            Continue
          </Button>
        ) : (
          <Button variant="success" onClick={handleComplete} disabled={loading}>
            {loading ? 'Finishing...' : 'Go to Dashboard'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default OnboardingWizard;

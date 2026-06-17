import React from 'react';

const TermsAndConditions = ({ onBack }) => {
  return (
    <div className="container-fluid bg-light min-vh-100 d-flex flex-column align-items-center py-5 px-3">
      <div className="card shadow border-0 rounded-4 w-100 p-4 p-md-5 mb-5" style={{ maxWidth: '900px' }}>
        <div className="mb-4 border-bottom pb-4">
          <h1 className="display-6 fw-bold text-dark mb-2">Terms and Conditions</h1>
          <p className="small text-muted mb-0">
            Last Updated: {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        <div className="text-secondary" style={{ lineHeight: '1.8' }}>
          <p className="mb-4">
            Welcome to the Tile Exporter ERP SaaS platform (the "Service"). These Terms and Conditions ("Terms") govern your access to and use of the Service provided by <strong>DigiMirchi Infotech</strong> ("Company", "we", "us", or "our"). 
            By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
          </p>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">1. Description of Service</h2>
            <p>
              The Service is a cloud-based Enterprise Resource Planning (ERP) platform designed for tile manufacturing, export management, accounting, and supply chain operations. 
              The Service is provided on a multi-tenant Software-as-a-Service (SaaS) basis. We reserve the right to modify, suspend, or discontinue the Service at any time, with or without notice.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">2. Account Registration and Security</h2>
            <p>
              To access certain features of the Service, you must register for an account. You are solely responsible for safeguarding the password and credentials that you use to access the Service. 
              You agree not to disclose your password to any third party. We cannot and will not be liable for any loss or damage arising from your failure to comply with the security obligations.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">3. Data Ownership and Backup</h2>
            <p className="mb-3">
              You retain all rights and ownership to the data, documents, and information you input into the Service ("Customer Data"). 
              While we implement industry-standard practices for data security and conduct regular systemic backups, <strong className="text-dark">you acknowledge that you are solely responsible for maintaining your own local copies and backups of your Customer Data.</strong>
            </p>
            <p className="fw-semibold text-dark">
              We expressly disclaim any liability for the loss, corruption, or deletion of Customer Data, whether caused by systemic failure, human error, third-party breaches, or force majeure events.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">4. Limitation of Liability</h2>
            <p className="text-uppercase fw-bold small text-dark mb-3" style={{ letterSpacing: '0.5px' }}>Please read this section carefully as it limits our liability to you.</p>
            <p className="mb-3">
              To the maximum extent permitted by applicable law, in no event shall DigiMirchi Infotech, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
            </p>
            <ul className="ps-4 mb-4">
              <li className="mb-2">Your access to or use of or inability to access or use the Service;</li>
              <li className="mb-2">Any conduct or content of any third party on the Service;</li>
              <li className="mb-2">Any content obtained from the Service; and</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content.</li>
            </ul>
            <div className="bg-light p-4 rounded border-start border-secondary border-4 text-dark fw-bold">
              In no event shall the aggregate liability of DigiMirchi Infotech exceed the total amount paid by you to DigiMirchi Infotech for the Service during the twelve (12) months immediately preceding the event giving rise to the claim.
            </div>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">5. Disclaimer of Warranties</h2>
            <p className="mb-3">
              Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            </p>
            <p>
              DigiMirchi Infotech does not warrant that a) the Service will function uninterrupted, secure, or available at any particular time or location; b) any errors or defects will be corrected; c) the Service is free of viruses or other harmful components; or d) the results of using the Service will meet your specific operational or legal requirements (such as export compliance or tax regulations).
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">6. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless DigiMirchi Infotech and its licensee and licensors, and their employees, contractors, agents, officers, and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of a) your use and access of the Service, by you or any person using your account and password, or b) a breach of these Terms.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">7. Governing Law and Jurisdiction</h2>
            <p className="mb-3">
              These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
            </p>
            <p className="fw-semibold text-dark">
              Any dispute, controversy, or claim arising out of or relating to these Terms, or the breach thereof, shall be subject to the exclusive jurisdiction of the courts located in <strong>Morbi, Gujarat, India</strong>.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">8. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

        </div>

        <div className="mt-5 pt-4 border-top d-flex justify-content-center">
          <button 
            type="button" 
            onClick={onBack} 
            className="btn btn-primary px-4 py-2 fw-medium shadow-sm"
            style={{ borderRadius: '8px' }}
          >
            &larr; Return to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;

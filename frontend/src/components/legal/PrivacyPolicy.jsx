import React from 'react';

const PrivacyPolicy = ({ onBack }) => {
  return (
    <div className="container-fluid bg-light min-vh-100 d-flex flex-column align-items-center py-5 px-3">
      <div className="card shadow border-0 rounded-4 w-100 p-4 p-md-5 mb-5" style={{ maxWidth: '900px' }}>
        <div className="mb-4 border-bottom pb-4">
          <h1 className="display-6 fw-bold text-dark mb-2">Privacy Policy</h1>
          <p className="small text-muted mb-0">
            Last Updated: {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        <div className="text-secondary" style={{ lineHeight: '1.8' }}>
          <p className="mb-3">
            <strong>DigiMirchi Infotech</strong> ("we", "us", or "our") operates the Tile Exporter ERP SaaS platform (the "Service"). 
            This page informs you of our policies regarding the collection, use, and disclosure of personal and corporate data when you use our Service and the choices you have associated with that data.
          </p>
          <p className="mb-4">
            By using the Service, you agree to the collection and use of information in accordance with this policy. 
            We are committed to protecting your privacy and ensuring that your business data remains secure and isolated within our multi-tenant architecture.
          </p>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">1. Information Collection and Use</h2>
            <p>
              We collect several different types of information for various purposes to provide and improve our Service to you.
            </p>
            <h3 className="h6 fw-bold text-dark mt-4 mb-2">Personal Data</h3>
            <p className="mb-3">
              While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:
            </p>
            <ul className="ps-4 mb-4">
              <li className="mb-2">Email address</li>
              <li className="mb-2">First name and last name</li>
              <li className="mb-2">Phone number</li>
              <li>Cookies and Usage Data</li>
            </ul>

            <h3 className="h6 fw-bold text-dark mt-4 mb-2">Corporate & Financial Data</h3>
            <p>
              As an ERP platform, you will input highly sensitive corporate information, including but not limited to export documentation, supplier details, client data, invoices, banking details, and proprietary product catalogs. 
              <strong className="text-dark">We do not claim ownership over this data.</strong> It is collected solely for the purpose of executing the core functions of the ERP software (e.g., generating proforma invoices, managing inventory, and creating packing lists).
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">2. Data Isolation and Multi-Tenancy</h2>
            <p>
              The Service is built on a multi-tenant architecture. We employ strict logical separation and access controls (such as Row-Level Security) to ensure that your Corporate Data is completely isolated from other tenants using the Service. 
              No other client or tenant will have access to your data, and you will not have access to theirs.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">3. Use of Data</h2>
            <p className="mb-3">DigiMirchi Infotech uses the collected data for various purposes:</p>
            <ul className="ps-4">
              <li className="mb-2">To provide and maintain our Service</li>
              <li className="mb-2">To notify you about changes to our Service</li>
              <li className="mb-2">To allow you to participate in interactive features of our Service when you choose to do so</li>
              <li className="mb-2">To provide customer support</li>
              <li className="mb-2">To gather analysis or valuable information so that we can improve our Service</li>
              <li className="mb-2">To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">4. Security of Data</h2>
            <p>
              The security of your data is of paramount importance to us. We utilize industry-standard encryption protocols (e.g., HTTPS/TLS) for data in transit and secure cloud infrastructure for data at rest. 
              However, remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal and Corporate Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">5. Service Providers and Third-Party Access</h2>
            <p className="mb-3">
              We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), provide the Service on our behalf, perform Service-related services, or assist us in analyzing how our Service is used (e.g., cloud hosting providers, analytics). 
            </p>
            <p>
              These third parties have access to your Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose. We do not sell your data to any third-party advertisers or brokers.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">6. Data Retention</h2>
            <p>
              We will retain your Personal and Corporate Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your data to the extent necessary to comply with our legal obligations (for example, if we are required to retain your data to comply with applicable laws in India), resolve disputes, and enforce our legal agreements and policies.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">7. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. We will let you know via email and/or a prominent notice on our Service, prior to the change becoming effective and update the "effective date" at the top of this Privacy Policy.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data handling practices, please contact us at DigiMirchi Infotech support.
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

export default PrivacyPolicy;

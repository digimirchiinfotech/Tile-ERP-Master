import React from 'react';

const PrivacyPolicy = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <div className="mb-8 border-b pb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">
            Last Updated: {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p>
            <strong>DigiMirchi Infotech</strong> ("we", "us", or "our") operates the Tile Exporter ERP SaaS platform (the "Service"). 
            This page informs you of our policies regarding the collection, use, and disclosure of personal and corporate data when you use our Service and the choices you have associated with that data.
          </p>
          <p>
            By using the Service, you agree to the collection and use of information in accordance with this policy. 
            We are committed to protecting your privacy and ensuring that your business data remains secure and isolated within our multi-tenant architecture.
          </p>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">1. Information Collection and Use</h2>
            <p>
              We collect several different types of information for various purposes to provide and improve our Service to you.
            </p>
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Personal Data</h3>
            <p>
              While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Email address</li>
              <li>First name and last name</li>
              <li>Phone number</li>
              <li>Cookies and Usage Data</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Corporate & Financial Data</h3>
            <p>
              As an ERP platform, you will input highly sensitive corporate information, including but not limited to export documentation, supplier details, client data, invoices, banking details, and proprietary product catalogs. 
              <strong>We do not claim ownership over this data.</strong> It is collected solely for the purpose of executing the core functions of the ERP software (e.g., generating proforma invoices, managing inventory, and creating packing lists).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">2. Data Isolation and Multi-Tenancy</h2>
            <p>
              The Service is built on a multi-tenant architecture. We employ strict logical separation and access controls (such as Row-Level Security) to ensure that your Corporate Data is completely isolated from other tenants using the Service. 
              No other client or tenant will have access to your data, and you will not have access to theirs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">3. Use of Data</h2>
            <p>DigiMirchi Infotech uses the collected data for various purposes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information so that we can improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">4. Security of Data</h2>
            <p>
              The security of your data is of paramount importance to us. We utilize industry-standard encryption protocols (e.g., HTTPS/TLS) for data in transit and secure cloud infrastructure for data at rest. 
              However, remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal and Corporate Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">5. Service Providers and Third-Party Access</h2>
            <p>
              We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), provide the Service on our behalf, perform Service-related services, or assist us in analyzing how our Service is used (e.g., cloud hosting providers, analytics). 
            </p>
            <p className="mt-2">
              These third parties have access to your Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose. We do not sell your data to any third-party advertisers or brokers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">6. Data Retention</h2>
            <p>
              We will retain your Personal and Corporate Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your data to the extent necessary to comply with our legal obligations (for example, if we are required to retain your data to comply with applicable laws in India), resolve disputes, and enforce our legal agreements and policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">7. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. We will let you know via email and/or a prominent notice on our Service, prior to the change becoming effective and update the "effective date" at the top of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data handling practices, please contact us at DigiMirchi Infotech support.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t flex justify-center">
          <button 
            type="button" 
            onClick={onBack} 
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors bg-transparent border-0 cursor-pointer"
          >
            &larr; Return to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

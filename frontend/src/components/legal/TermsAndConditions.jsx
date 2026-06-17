import React from 'react';

const TermsAndConditions = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <div className="mb-8 border-b pb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Terms and Conditions</h1>
          <p className="text-sm text-gray-500">
            Last Updated: {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p>
            Welcome to the Tile Exporter ERP SaaS platform (the "Service"). These Terms and Conditions ("Terms") govern your access to and use of the Service provided by <strong>DigiMirchi Infotech</strong> ("Company", "we", "us", or "our"). 
            By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
          </p>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">1. Description of Service</h2>
            <p>
              The Service is a cloud-based Enterprise Resource Planning (ERP) platform designed for tile manufacturing, export management, accounting, and supply chain operations. 
              The Service is provided on a multi-tenant Software-as-a-Service (SaaS) basis. We reserve the right to modify, suspend, or discontinue the Service at any time, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">2. Account Registration and Security</h2>
            <p>
              To access certain features of the Service, you must register for an account. You are solely responsible for safeguarding the password and credentials that you use to access the Service. 
              You agree not to disclose your password to any third party. We cannot and will not be liable for any loss or damage arising from your failure to comply with the security obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">3. Data Ownership and Backup</h2>
            <p>
              You retain all rights and ownership to the data, documents, and information you input into the Service ("Customer Data"). 
              While we implement industry-standard practices for data security and conduct regular systemic backups, <strong>you acknowledge that you are solely responsible for maintaining your own local copies and backups of your Customer Data.</strong>
            </p>
            <p className="font-semibold text-gray-900 mt-2">
              We expressly disclaim any liability for the loss, corruption, or deletion of Customer Data, whether caused by systemic failure, human error, third-party breaches, or force majeure events.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">4. Limitation of Liability</h2>
            <p className="uppercase font-semibold text-sm tracking-wide text-gray-900 mb-2">Please read this section carefully as it limits our liability to you.</p>
            <p>
              To the maximum extent permitted by applicable law, in no event shall DigiMirchi Infotech, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your access to or use of or inability to access or use the Service;</li>
              <li>Any conduct or content of any third party on the Service;</li>
              <li>Any content obtained from the Service; and</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content.</li>
            </ul>
            <p className="mt-4 font-bold text-gray-900 bg-gray-100 p-4 rounded-lg border-l-4 border-gray-500">
              In no event shall the aggregate liability of DigiMirchi Infotech exceed the total amount paid by you to DigiMirchi Infotech for the Service during the twelve (12) months immediately preceding the event giving rise to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">5. Disclaimer of Warranties</h2>
            <p>
              Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            </p>
            <p className="mt-2">
              DigiMirchi Infotech does not warrant that a) the Service will function uninterrupted, secure, or available at any particular time or location; b) any errors or defects will be corrected; c) the Service is free of viruses or other harmful components; or d) the results of using the Service will meet your specific operational or legal requirements (such as export compliance or tax regulations).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">6. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless DigiMirchi Infotech and its licensee and licensors, and their employees, contractors, agents, officers, and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of a) your use and access of the Service, by you or any person using your account and password, or b) a breach of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">7. Governing Law and Jurisdiction</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
            </p>
            <p className="mt-2 font-semibold">
              Any dispute, controversy, or claim arising out of or relating to these Terms, or the breach thereof, shall be subject to the exclusive jurisdiction of the courts located in <strong>Morbi, Gujarat, India</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">8. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
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

export default TermsAndConditions;

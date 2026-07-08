// Standalone legal content components — no external network requests.

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
        {n}. {title}
      </h2>
      <div className="flex flex-col gap-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function OL({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal pl-4 flex flex-col gap-1">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ol>
  );
}

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-4 flex flex-col gap-1">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export function TermsContent() {
  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Terms and Conditions</h1>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Effective as of 1 January 2019</p>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        The following section lists our Terms and Conditions. As this affects your legal rights, please ensure
        that you familiarise yourself with this page, as well as the Privacy Policy.
      </p>

      <Section n={1} title="Introduction">
        <P>Please peruse these Agreements carefully as they encompass important information about Crawfort Service provided to you, the Terms, future changes to these Agreements, Privacy Information, waiver, limitation of liability, Governing Law etc.</P>
        <P>In order to use Crawfort Service, you need to be (1) 18 or older, (2) have the power and capability to enter into a legally binding contract with us and not barred from doing so under any applicable laws and (3) be a resident or legally employed in Singapore.</P>
        <P>By clicking &quot;Apply Now&quot; or otherwise applying/engaging Crawfort Pte. Ltd. (&quot;Crawfort&quot;, the &quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) financial service (&quot;Crawfort Service&quot; or &quot;Service&quot; or &quot;Loan&quot;), including via software application or website, you are entering into a binding contract with Crawfort Pte Ltd (UEN No. 201406595W).</P>
        <P>Your agreement with us includes these Terms and Conditions (&quot;Terms&quot;) and our Personal Data Protection Policy (the &quot;Privacy Policy&quot;). If you wish to review the terms of the Agreements, the latest and effective version can be found on Crawfort&apos;s Website – www.crawfort.com. You acknowledge that you have read, understood and accept these agreements. If you don&apos;t agree with (or cannot comply with) the agreements, then you are not eligible to use Crawfort service.</P>
        <P>By continuing to use the Crawfort service, you signify that you have read, understood and agree to the collection, use, retention, disposal, handling, transfer, processing and/or disclosure of your personal data by Crawfort, in accordance with these agreements.</P>
        <P>You further represent, warrant and promise that any information submitted to Crawfort is true, accurate and complete to the best of your knowledge and belief. You may be held liable if information submitted is found to be false, untrue or misleading.</P>
        <P>Any information that you have provided may be corrected by contacting us at <span className="font-medium">dpo@crawfort.com</span>.</P>
      </Section>

      <Section n={2} title="Changes to the Agreements">
        <P>We reserve the right to modify or amend these Agreements at any time. When material changes are made, we will provide notice by (1) notifying you via our software application, (2) sending you an email, or (3) sending you a text message. We endeavour to notify you at least 14 days in advance. Your continued use after being served such notice shall constitute your acceptance of the changes.</P>
        <P>If you do not wish to continue using our Service, you may terminate these Agreements by contacting us at +65 6777 8080 or <span className="font-medium">info@crawfort.com</span>.</P>
      </Section>

      <Section n={3} title="Intellectual Property and Copyright">
        <P>All Crawfort trademarks, service marks, trade names, logos, domain names, and any other features of Crawfort (&quot;Crawfort Brand Features&quot;) may not be used in connection with any product or service without the prior written consent of Crawfort.</P>
        <P>You shall not reverse-engineer or modify the system designs of Crawfort Service.</P>
        <P>If you believe that Crawfort has infringed your copyright, please submit a notice to:</P>
        <P>Att: Data Protection Officer, Crawfort Pte Ltd, 35 North Canal Road #02-01, Singapore 059291</P>
      </Section>

      <Section n={4} title="Third Party Applications">
        <P>Crawfort Service is integrated with third party applications, websites and services (&quot;Third Party Application&quot;) to enable us to provide you with our Service. The Third Party Application has their own terms and conditions and privacy policies of which you will be notified prior to signing your Loan contract with us. Crawfort does not endorse and is not responsible or liable for the behaviour, features, or content of any Third Party Application.</P>
      </Section>

      <Section n={5} title="Our Rights">
        <P>Crawfort reserves the right to remove or disable access to any user/applicant for any or no reason, including but not limited to any violation of these Agreements or any applicable law.</P>
        <P>In consideration of the Service provided, you grant us the rights to:</P>
        <OL items={[
          "Allow Crawfort Service to use the processor, bandwidth, and storage hardware on your Device to facilitate the operation of the Service;",
          "Provide advertising and other information to you, and contact you via telephone and email for loan application purposes;",
          "Collect, use, retain, dispose, handle, transfer, process and/or disclose your personal data, in accordance with our privacy policy; and",
          "Allow our affiliates to do the same.",
        ]} />
        <P>Should you opt to not receive advertising from Crawfort or its affiliates, kindly convey your intentions to <span className="font-medium">info@crawfort.com</span>.</P>
      </Section>

      <Section n={6} title="User Guidelines">
        <P>To ensure compliance with applicable laws, you must strictly observe the following:</P>
        <UL items={[
          "You MUST NOT share your Crawfort login details, Myinfo/Singpass/device/email account with any third party;",
          "You shall not use any automated means (bots, spiders etc.) to collect information or gain unauthorised access to Crawfort systems;",
          "You shall not impersonate another user, person, or entity, or engage in fraudulent, false, deceptive, or misleading conduct;",
          "You shall keep your Crawfort account login details confidential and secure. If lost/stolen or if you believe there has been unauthorised access, please notify us immediately at info@crawfort.com;",
          "You shall not interfere with or disrupt the Crawfort Service, or attempt to probe, scan or test for vulnerabilities; and",
          "You shall not contravene the Agreements.",
        ]} />
        <P>Contravening any of the above may result in immediate termination or suspension of your user account.</P>
      </Section>

      <Section n={7} title="Service Limitations and Modifications">
        <P>Crawfort will make reasonable efforts to keep the Service operational. However, certain technical difficulties or maintenance may result in temporary interruptions. To the extent permissible under applicable law, Crawfort reserves the right at any time to modify or discontinue, temporarily or permanently, functions and features of the Service, with or without notice.</P>
      </Section>

      <Section n={8} title="Customer Support">
        <P>For customer support or any queries, kindly submit a ticket via our Contact Us section at www.crawfort.com or call us at +65 6777 8080. We will attempt to respond to all queries within 5 working days.</P>
      </Section>

      <Section n={9} title="Term and Termination">
        <P>This Agreement will continue to apply until terminated by you or Crawfort. If you wish to terminate, you may do so by emailing us at <span className="font-medium">info@crawfort.com</span>.</P>
        <P>Clauses 3, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16 and 17 shall survive the termination of the Agreements.</P>
      </Section>

      <Section n={10} title="Warranty and Disclaimer">
        <P>Crawfort Service is provided &quot;as available&quot;, without express or implied warranty or condition of any kind. You use our service at your own risk. To the fullest extent permitted by applicable law, Crawfort and all owners of the content make no representations and disclaim any warranties or conditions of satisfactory quality, merchantability, fitness for particular purpose, or non-infringement.</P>
      </Section>

      <Section n={11} title="Limitation">
        <P>To the fullest extent permitted by law, in no event will Crawfort, its officers, shareholders, employees, agents or directors be liable for (1) any indirect, special, incidental, punitive, exemplary, or consequential damages; or (2) any loss of use, data, business or profits, in all cases arising out of the use or inability to use the Crawfort Service.</P>
      </Section>

      <Section n={12} title="Entire Agreement">
        <P>These Agreements constitute all the terms and conditions agreed upon between you and Crawfort and supersede any prior agreements in relation to the subject matter, whether written or oral. Additional terms may apply when entering into a loan agreement with Crawfort, in which case the additional terms shall prevail in the event of any irreconcilable conflict.</P>
      </Section>

      <Section n={13} title="Severability and Waiver">
        <P>Should any provision of the Agreements be held invalid or unenforceable for any reason, such invalidity and unenforceability shall not in any manner affect or render invalid or unenforceable the remaining provisions of the Agreements. Any failure by Crawfort to enforce the Agreements or any provision thereof shall not waive Crawfort&apos;s rights to do so.</P>
      </Section>

      <Section n={14} title="Assignment">
        <P>Crawfort may assign the Agreements or any part of them and may delegate any of its obligations. You may not assign the Agreements or any part of them, nor transfer your rights and obligations to any third party.</P>
      </Section>

      <Section n={15} title="Indemnification">
        <P>To the fullest extent permitted by applicable law, you agree to indemnify and hold Crawfort harmless from all damages, losses and expenses of any kind (including reasonable legal fees and costs) arising out of: (1) your breach of this agreement; and (2) your violation of any law.</P>
      </Section>

      <Section n={16} title="Counterparts">
        <P>These Agreements may be executed in separate counterparts, each such counterpart being deemed to be an original instrument, and all such counterparts shall together constitute the same agreement.</P>
      </Section>

      <Section n={17} title="Governing Law and Jurisdiction">
        <P>These Agreements and all matters arising herein shall be governed by and construed in accordance with the law of the Republic of Singapore and the Parties agree to submit to the exclusive jurisdiction of the Singapore Courts.</P>
      </Section>

      <Section n={18} title="Contact Us">
        <P>If you have any questions concerning Crawfort Service or the Agreements, please contact us at <span className="font-medium">info@crawfort.com</span>.</P>
        <P>Thank you for reading our Terms and Conditions. We hope you will enjoy our Service.</P>
      </Section>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Personal Data Protection Policy</h1>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Crawfort Pte. Ltd.</p>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        The following section lists our Privacy Policy. As this affects your legal rights, please ensure
        that you familiarise yourself with this page, as well as the Terms and Conditions.
      </p>

      <Section n={1} title="Introduction">
        <P>Crawfort Pte Ltd (the &quot;Company&quot;) takes our responsibilities under Singapore&apos;s Personal Data Protection Act 2012 (the &quot;PDPA&quot;) seriously. We recognise the importance of the personal data our customers, employees and third parties have personally entrusted to us and believe that it is our responsibility to properly manage and protect their personal data.</P>
      </Section>

      <Section n={2} title="Purpose">
        <P>This policy governs the collection, use and disclosure of personal data and explains how we collect and handle personal data of individuals in compliance with the PDPA. In this policy, &quot;personal data&quot; shall have the meaning ascribed to it in the PDPA.</P>
      </Section>

      <Section n={3} title="Responsible">
        <P>The Company&apos;s appointed Data Protection Officer (DPO) will update this Data Protection Policy from time to time to ensure that this policy is consistent with future developments, market trends and/or any changes in technology, legal or regulatory requirements.</P>
      </Section>

      <Section n={4} title="Scope">
        <P>This policy covers all the activities of Crawfort Pte Ltd related to Personal Data received from employees, customers and third parties.</P>
      </Section>

      <Section n={5} title="Consent">
        <P>We will collect, use or disclose personal data for employment and reasonable business purposes only if there is consent or deemed consent from the individual and information on such purposes have been notified, or if required or authorised under applicable laws.</P>
        <P>Such consents are obtained from our customers via application form, signing of loan contracts or by customer&apos;s declaration that they have read and consent to our Terms and Conditions.</P>
      </Section>

      <Section n={6} title="Collection of Personal Data">
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>6.1 Personal Data Collected from Customers</p>
        <P>We only collect personal data from our customers to enable us to understand their financial needs and assess their loan application as required by law. We will not use or disclose information collected from our customers other than the purposes made known herein or as may be necessary to comply with applicable laws.</P>
        <P>We use personal data of customers for the following purposes:</P>
        <OL items={[
          "Submission to Moneylenders Credit Bureau (MLCB) for the purpose of producing a credit report.",
          "Submission to the Registry of Moneylenders.",
          "Conducting online searches via web portals such as DP Information Network Pte Ltd, Credit Bureau (Singapore) Pte Ltd and Credit Association of Singapore.",
          "Understanding our customer's financial needs and customising loan packages.",
          "Assessing our customer's loan application and complying with the laws of Singapore.",
          "Carrying out our operations and legal obligations.",
          "Disclosure for the purposes of recovery of overdue loans.",
          "Debt recovery purposes (engaging law firms, third party debt collection agencies or approved debt collectors).",
          "Auditing and accounting purposes.",
          "Disclosures to other Licensed Moneylenders.",
        ]} />
        <P>The personal data collected includes: Full Name, NRIC/FIN/Passport No., Nationality, Date of Birth, Sex, Ethnicity, Address, Contact No., Marriage Status, Email Address, Income, Employment information, Photograph, and Next-of-Kin contact details.</P>

        <p className="font-semibold mt-2" style={{ color: "var(--text-primary)" }}>6.2 Personal Data collected from Employees</p>
        <P>We collect personal data from our employees to manage their employment. Such data is used for: performance evaluation, CPF purposes, work permit applications, managing staff schemes, employment letters, work-related insurance, and staff directory.</P>

        <p className="font-semibold mt-2" style={{ color: "var(--text-primary)" }}>6.3 Personal Data collected from Third Parties</p>
        <P>The Company may disclose your personal data to third parties to assist with the Company&apos;s activities only when we have the individual&apos;s consent or deemed consent, or when required by law. Any such third parties are bound contractually to keep information confidential.</P>
      </Section>

      <Section n={7} title="Disclosure of Personal Data">
        <P>We do not disclose personal data of customers to third parties except when required by law, when we have the individual&apos;s consent, or when we have engaged third parties to assist with debt recovery or certain aspects of the company&apos;s activities such as accounting and auditing functions.</P>
        <P>We will disclose personal data to the Moneylenders Credit Bureau (MLCB) for the purposes of obtaining and producing a credit report, as required by law. When sharing personal data, we will ensure that the data is verified against the latest original documents and/or information extracted from Myinfo or Singpass.</P>
      </Section>

      <Section n={8} title="Access to and Correction of Personal Data">
        <P>Upon request, we will provide individuals with access to their personal data or other appropriate information in accordance with the requirements of the PDPA. We will correct an error or omission in an individual&apos;s personal data within 5 working days of request. Customers may contact us at <span className="font-medium">dpo@crawfort.com</span>.</P>
      </Section>

      <Section n={9} title="Withdrawal of Consent">
        <P>Requests for withdrawal of consent will be processed within 5 working days. We will inform the individual of the likely consequences of withdrawing their consent. Thereafter, we will cease collecting, using or disclosing the personal data unless required or authorised under applicable laws.</P>
      </Section>

      <Section n={10} title="Accuracy of Personal Data">
        <P>We ensure that personal data collected is accurate, genuine and up-to-date by verifying the data against the original relevant document or via verified sources such as Singpass or Myinfo.</P>
      </Section>

      <Section n={11} title="Security and Protection of Personal Data">
        <P>We have implemented generally accepted standards of technology and operational security to protect the personal data in our possession and to prevent unauthorised access, collection, use, disclosure, copying, modification, disposal, retention or similar risks. Access to personal data is only given to our personnel on a necessary basis, kept to a minimum, and where they have agreed to ensure confidentiality.</P>
      </Section>

      <Section n={12} title="Retention of Personal Data">
        <P>The minimum retention period of information relating to the loan, which includes our customer&apos;s personal data, is 5 years after the termination of the loan as required by law. Thereafter, we will cease to retain their personal data as soon as it is reasonable to assume that the purpose for collection is no longer being served.</P>
      </Section>

      <Section n={13} title="Transfer of Personal Data outside of Singapore">
        <P>We do not transfer data overseas. However, should there be any transfers of personal data to a territory outside of Singapore, we will ensure that it is in accordance with the PDPA so as to ensure a standard of protection comparable to the protection under the PDPA.</P>
      </Section>

      <Section n={14} title="Privacy on Our Websites">
        <P>This Policy also applies to any personal data we collect via our websites. Cookies may be used on some pages of our websites to provide a more customised experience. If individuals are concerned about cookies, most browsers permit individuals to decline them. In most cases, a visitor may refuse a cookie and still fully navigate our websites.</P>
      </Section>

      <Section n={15} title="Notification">
        <P>We endeavour to notify our customers and third parties of any changes to this policy 14 days in advance, after which the changes will be made effective and published on our website. Communication will be made via our software application, email, text or written notice, at our discretion.</P>
      </Section>

      <Section n={16} title="Data Protection Officer">
        <P>If you believe that information we hold about you is incorrect or outdated, or if you have concerns or further queries about how we are handling your personal data, you may contact our Data Protection Officer at <span className="font-medium">dpo@crawfort.com</span>.</P>
      </Section>
    </div>
  );
}

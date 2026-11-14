// Terms & Conditions and Cookie Policy text, as supplied in the content document.
// Each block is either a paragraph (string) or a list ({ list: [...] }).

const contactBlock = [
  "Nivie Designs",
  "Website: https://niviedesigns.com/",
  "Email: niviedesigns333@gmail.com",
  "Phone: 9226333902",
  "Address: Office No, 2nd Floor, Gurukrupa Building, 2, LMD Chowk, Bavdhan, Pune, Maharashtra 411021",
];

export const terms = {
  title: "Terms & Conditions",
  intro:
    "Welcome to Nivie Designs. By accessing and using our website, you agree to comply with the following Terms & Conditions. Please read them carefully before using our website or engaging with our services.",
  sections: [
    {
      h: "1. Acceptance of Terms",
      body: [
        "By accessing this website, you acknowledge that you have read, understood, and agreed to these Terms & Conditions. If you do not agree with any part of these terms, please discontinue using the website.",
      ],
    },
    {
      h: "2. About Our Services",
      body: [
        "Nivie Designs provides design-related services, including:",
        { list: ["Architecture Design", "Interior Design", "Landscape Design"] },
        "All services are subject to individual project requirements, availability, scope of work, and mutually agreed terms.",
      ],
    },
    {
      h: "3. Website Usage",
      body: [
        "You agree to use this website only for lawful purposes. You must not:",
        {
          list: [
            "Use the website for any illegal or unauthorised activity.",
            "Attempt to disrupt or damage the website or its functionality.",
            "Submit false, misleading, or inaccurate information.",
            "Copy, reproduce, or misuse website content without permission.",
          ],
        },
        "We reserve the right to restrict access to users who violate these terms.",
      ],
    },
    {
      h: "4. Intellectual Property Rights",
      body: [
        "All website content, including text, photographs, graphics, designs, logos, illustrations, and other materials, belongs to Nivie Designs or its respective content owners unless otherwise stated.",
        "You may not reproduce, distribute, modify, publish, or commercially use any website content without prior written permission.",
        "Unauthorised use of our intellectual property is prohibited.",
      ],
    },
    {
      h: "5. Project Enquiries and Communication",
      body: [
        "Visitors may contact us through website forms, email, phone, or other communication channels to enquire about our services.",
        "By submitting an enquiry, you agree to provide accurate and complete information. Submitting an enquiry does not automatically establish a client relationship or guarantee the availability of our services.",
        "A formal project engagement will begin only after the scope, fees, timelines, and other relevant terms have been mutually agreed upon.",
      ],
    },
    {
      h: "6. Project Scope and Payments",
      body: [
        "Project-specific details, including deliverables, design revisions, timelines, fees, payment schedules, and responsibilities, will be communicated and agreed upon separately with the client.",
        "Any changes to the original project scope may affect the agreed fees and timelines.",
        "The terms of a signed proposal, quotation, or service agreement will govern the respective project wherever applicable.",
      ],
    },
    {
      h: "7. Design Visuals and Project Representations",
      body: [
        "Images, 3D visualisations, drawings, illustrations, and portfolio presentations displayed on our website are intended to showcase our design capabilities and creative work.",
        "Actual project outcomes may vary depending on site conditions, material availability, technical requirements, execution, and other external factors.",
        "Visual representations should not be considered a guarantee of identical final results.",
      ],
    },
    {
      h: "8. Third-Party Links",
      body: [
        "Our website may contain links to external websites or third-party platforms for additional information or convenience.",
        "Nivie Designs does not control or take responsibility for the content, privacy practices, accuracy, or services offered by these external websites.",
        "Users are encouraged to review the respective third-party terms and privacy policies before interacting with them.",
      ],
    },
    {
      h: "9. Limitation of Liability",
      body: [
        "We make reasonable efforts to ensure that the information available on our website is accurate and up to date. However, we do not guarantee that all website content will always be complete, accurate, or error-free.",
        "Nivie Designs shall not be held liable for any direct or indirect loss or damage arising from the use of this website, reliance on its content, temporary website unavailability, or third-party website interactions, to the extent permitted by applicable law.",
      ],
    },
    {
      h: "10. Privacy and Personal Information",
      body: [
        "Any personal information submitted through our website will be handled in accordance with our Privacy Policy.",
        "We encourage visitors to review our Privacy Policy to understand how their information is collected, used, and protected.",
      ],
    },
    {
      h: "11. Changes to These Terms",
      body: [
        "Nivie Designs reserves the right to modify, update, or revise these Terms & Conditions at any time without prior notice.",
        "Any changes will be published on this page along with the updated revision date. Continued use of our website after such changes indicates acceptance of the revised terms.",
      ],
    },
    {
      h: "12. Governing Law and Jurisdiction",
      body: [
        "These Terms & Conditions shall be governed by and interpreted in accordance with the applicable laws of India.",
        "Any disputes arising from the use of this website shall be subject to the jurisdiction of the competent courts at Pune, Maharashtra, India.",
      ],
    },
    {
      h: "13. Contact Us",
      body: [
        "If you have any questions or concerns regarding these Terms & Conditions, please contact us.",
        { list: contactBlock, plain: true },
        "We appreciate your interest in Nivie Designs and thank you for visiting our website.",
      ],
    },
  ],
};

export const cookies = {
  title: "Cookie Policy",
  intro:
    "At Nivie Designs, we use cookies and similar technologies to improve your browsing experience, understand how visitors interact with our website, and enhance our online services. This Cookie Policy explains what cookies are, how we use them, and how you can manage your cookie preferences when visiting https://niviedesigns.com/.",
  sections: [
    {
      h: "1. What Are Cookies?",
      body: [
        "Cookies are small text files stored on your device when you visit a website. They help websites recognise your device, remember your preferences, and provide a smoother browsing experience.",
        "Cookies may collect information such as browser type, device details, pages visited, and website interactions.",
      ],
    },
    {
      h: "2. Why Do We Use Cookies?",
      body: [
        "Nivie Designs may use cookies for the following purposes:",
        {
          list: [
            "Essential Cookies: Help our website function properly and enable basic features.",
            "Performance Cookies: Help us understand how visitors use our website and identify areas for improvement.",
            "Functional Cookies: Remember user preferences and settings to provide a better browsing experience.",
            "Analytics Cookies: Help us measure website traffic, visitor behaviour, and overall website performance.",
            "Marketing Cookies: May be used to understand advertising performance and deliver more relevant promotional content, where applicable and with the required consent.",
          ],
        },
      ],
    },
    {
      h: "3. Types of Cookies We Use",
      body: [
        "Depending on the tools and technologies implemented on our website, we may use the following types of cookies:",
        "First-Party Cookies — These cookies are placed directly by our website to support its functionality and remember user preferences.",
        "Third-Party Cookies — These cookies may be placed by external services integrated into our website, such as analytics tools, advertising platforms, or embedded content providers. Third-party cookies are governed by the respective providers' privacy and cookie policies.",
      ],
    },
    {
      h: "4. How We Use Cookie Information",
      body: [
        "The information collected through cookies may help us:",
        {
          list: [
            "Improve website performance and functionality.",
            "Understand visitor interests and browsing patterns.",
            "Analyse website traffic and engagement.",
            "Remember user preferences.",
            "Measure the effectiveness of marketing campaigns.",
            "Improve the overall user experience.",
          ],
        },
      ],
    },
    {
      h: "5. Third-Party Services",
      body: [
        "Our website may use third-party tools and services to support website analytics, performance measurement, and marketing activities. These may include services such as:",
        { list: ["Google Analytics", "Google Ads", "Google Tag Manager", "Meta advertising tools"] },
        "The actual services and cookies used depend on the tools configured on our website. These third-party providers may collect information according to their respective policies.",
      ],
    },
    {
      h: "6. Managing Your Cookie Preferences",
      body: [
        "You have control over how cookies are used on your device.",
        "You can manage your cookie preferences through our website's cookie consent banner, where available.",
        "You can also manage or delete cookies through your browser settings. Most web browsers allow you to block cookies, delete existing cookies, or receive notifications before cookies are stored.",
        "Please note that disabling certain cookies may affect some website features and functionality.",
      ],
    },
    {
      h: "7. How Long Do Cookies Stay on Your Device?",
      body: [
        "Cookies may remain on your device for different periods depending on their purpose.",
        "Session Cookies: These cookies are temporary and are generally deleted when you close your browser.",
        "Persistent Cookies: These cookies remain on your device for a specified period or until you manually delete them.",
        "The duration depends on the specific cookie and the service that places it.",
      ],
    },
    {
      h: "8. Data Privacy and Security",
      body: [
        "We value your privacy and take reasonable measures to protect information collected through our website.",
        "Cookie-related information is handled in accordance with our Privacy Policy and applicable data protection laws.",
        "We do not intend to use cookies to collect sensitive personal information without an appropriate legal basis.",
      ],
    },
    {
      h: "9. Updates to This Cookie Policy",
      body: [
        "We may update this Cookie Policy from time to time to reflect changes in our website functionality, technologies, legal requirements, or business practices.",
        "Any updates will be published on this page along with the revised date.",
        "We encourage visitors to review this page periodically to stay informed about our cookie practices.",
      ],
    },
    {
      h: "10. Contact Us",
      body: [
        "If you have any questions about this Cookie Policy or how cookies are used on our website, please contact us.",
        { list: contactBlock, plain: true },
        "Thank you for visiting Nivie Designs. We appreciate your trust and value your privacy.",
      ],
    },
  ],
};

// Privacy Policy — from https://niviedesigns.com/privacy-policy.php
export const privacy = {
  title: "Privacy Policy",
  intro:
    "At Nivie Designs, we respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, store, and protect your information when you visit our website or contact us regarding our services.",
  sections: [
    {
      h: "Information We Collect",
      body: [
        "We may collect personal information that you voluntarily provide through contact forms, enquiry forms, emails, phone calls, or other communication channels. This may include your name, email address, phone number, project requirements, and any other information you choose to share.",
        "We may also collect certain technical information when you visit our website, such as your IP address, browser type, device information, pages visited, and general website usage data.",
      ],
    },
    {
      h: "How We Use Your Information",
      body: [
        "The information collected may be used to:",
        {
          list: [
            "Respond to enquiries and project-related questions.",
            "Understand your requirements and provide relevant information about our services.",
            "Communicate with you regarding consultations, proposals, or ongoing projects.",
            "Improve our website, services, and user experience.",
            "Maintain website security and prevent misuse.",
            "Meet applicable legal and regulatory obligations.",
          ],
        },
        "We will use your information only for legitimate purposes and in accordance with applicable law.",
      ],
    },
    {
      h: "Cookies and Website Analytics",
      body: [
        "Our website may use cookies and similar technologies to improve functionality, understand visitor behaviour, and analyse website performance.",
        "You may be able to manage or disable cookies through your browser settings. Disabling certain cookies may affect some website features.",
        "If we use third-party analytics or advertising tools, those services may process certain information according to their own privacy policies.",
      ],
    },
    {
      h: "Sharing of Information",
      body: [
        "Nivie Designs does not sell your personal information. We may share information with authorised service providers who help us operate our website, manage enquiries, or provide related services. Information may also be disclosed where required by law or necessary to protect our legal rights.",
        "We take reasonable steps to ensure that any sharing of personal information is limited to what is necessary for the relevant purpose.",
      ],
    },
    {
      h: "Data Security and Retention",
      body: [
        "We take reasonable measures to protect personal information against unauthorised access, loss, misuse, or disclosure. However, no method of electronic transmission or storage can be guaranteed to be completely secure.",
        "We retain personal information only for as long as reasonably necessary to fulfil the purposes for which it was collected, meet legal obligations, or resolve disputes.",
      ],
    },
    {
      h: "Your Privacy Rights",
      body: [
        "Depending on applicable law, you may have the right to request access to, correction of, or deletion of your personal information, or to withdraw consent where processing is based on consent.",
        "To make a privacy-related request, please contact us using the details below.",
      ],
    },
    {
      h: "Third-Party Websites",
      body: [
        "Our website may contain links to external websites. We are not responsible for their content, security, or privacy practices. We recommend reviewing their privacy policies before sharing personal information.",
      ],
    },
    {
      h: "Children's Privacy",
      body: [
        "Our website and services are not specifically directed at children. We do not knowingly collect personal information from children in circumstances where such collection is prohibited by applicable law.",
      ],
    },
    {
      h: "Changes to This Privacy Policy",
      body: [
        "We may update this Privacy Policy from time to time to reflect changes in our practices, services, or applicable laws. Any updates will be published on this page with a revised effective date, where appropriate.",
      ],
    },
    {
      h: "Contact Us",
      body: [
        "For questions, concerns, or requests relating to this Privacy Policy, please contact:",
        {
          list: [
            "Nivie Designs",
            "Email: niviedesigns333@gmail.com",
            "Website: https://www.niviedesigns.com/",
            "Address: Office No, 2nd Floor, Gurukrupa Building, 2, LMD Chowk, Bavdhan, Pune, Maharashtra 411021",
          ],
          plain: true,
        },
      ],
    },
  ],
  updated: "Last Updated: 12th October 2026",
};

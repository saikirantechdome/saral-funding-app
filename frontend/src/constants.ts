export interface DocumentGroup {
  label: string;
  options: string[];
}

// Shared across admin scheme creation (Documents Required) and the user
// Document Vault (Document Type) so both stay in sync.
export const DOCUMENT_TYPE_GROUPS: DocumentGroup[] = [
  {
    label: "Common Documents",
    options: [
      "Aadhaar Card",
      "PAN Card",
      "GST Certificate",
      "Udyam Certificate",
      "Bank Statement (6 months)",
      "ITR (Income Tax Return)",
      "Project Report",
      "Quotation / Invoice",
      "Partnership Deed",
      "Property Papers",
    ],
  },
  {
    label: "Applicant / KYC Documents",
    options: [
      "PAN & Aadhaar of all promoters/directors",
      "Passport-size photographs",
      "Address proof",
      "PAN",
      "Aadhaar",
      "GST",
      "Bank Account Details",
      "Cancelled Cheque",
      "Bank Certificate",
    ],
  },
  {
    label: "Registration & Business Documents",
    options: [
      "Udyam Registration",
      "GST Registration",
      "Certificate of Incorporation / Partnership Deed / LLP Agreement",
      "MOA & AOA (for companies)",
      "Board Resolution (for companies)",
      "Company Registration Documents",
      "Shop & Establishment Registration (if applicable)",
      "Factory Licence",
    ],
  },
  {
    label: "Project Documents",
    options: [
      "Detailed Project Report (DPR)",
      "Detailed Project Report (CA Certified)",
      "Project Cost & Means of Finance",
      "Projected Financial Statements (5–7 years)",
      "DSCR Calculation",
      "CMA Data",
      "Break-even Analysis",
      "Cash Flow Projection",
      "Loan Sanction Letter",
      "Loan Disbursement Details",
      "CA Certificate of Investment",
    ],
  },
  {
    label: "Land & Building Documents",
    options: [
      "Sale Deed / Lease Deed",
      "Land Revenue Records",
      "Mutation",
      "Approved Building Plan",
      "Building Estimate (Civil Engineer)",
      "Architect Certificate",
      "Construction Cost Estimate",
      "Site Layout",
      "Land Ownership / Lease Documents",
      "Approved Layout Plan",
      "Building Approval",
      "Gram Panchayat / Local Authority NOC (where applicable)",
    ],
  },
  {
    label: "Machinery & Investment Documents",
    options: [
      "Machinery Quotations",
      "Proforma Invoices",
      "Vendor Details",
      "Technical Specifications",
      "Machinery Layout",
      "Installation Schedule",
      "Machinery Invoices",
      "Machinery Payment Proof",
      "Building Bills",
      "Civil Work Bills",
      "Fixed Asset Register",
      "Chartered Engineer Certificate",
      "Installation Certificate",
    ],
  },
  {
    label: "Financial Documents",
    options: [
      "Last 3 years ITRs (Promoters)",
      "Bank Statements (12 months)",
      "Net Worth Statement",
      "Asset & Liability Statement",
      "Existing Loan Details",
      "CIBIL Report (if requested)",
      "Audited Financial Statements (Existing Business)",
      "Projected Financials (New Unit)",
      "GST Returns",
      "Income Tax Returns",
      "Audited Financial Statements",
      "CA Certified Investment Statement",
    ],
  },
  {
    label: "Working Capital Assessment",
    options: [
      "Stock Statement",
      "Inventory Details",
      "Debtors Ageing",
      "Creditors Ageing",
      "Purchase Projection",
      "Sales Projection",
      "Monthly Cash Budget",
      "Operating Cycle Calculation",
    ],
  },
  {
    label: "Existing Banking Documents",
    options: [
      "Existing CC/OD Limits",
      "Loan Statements",
      "Sanction Letters",
      "NOC (if takeover case)",
    ],
  },
  {
    label: "Security / Collateral Documents",
    options: [
      "Collateral Property Documents (if applicable)",
      "Property Valuation",
      "Legal Search Report",
      "Insurance Proposal",
      "Hypothecation of Stock",
      "Book Debts Statement",
      "Collateral Documents (if applicable)",
    ],
  },
  {
    label: "Statutory Approvals",
    options: [
      "Pollution Control Consent to Establish (CTE)",
      "Pollution Control Consent to Operate (CTO)",
      "Fire NOC (if applicable)",
      "Electricity Connection",
      "Water Connection",
    ],
  },
  {
    label: "Commercial Production Proof",
    options: [
      "First Commercial Sale Invoice",
      "Production Commencement Certificate",
      "GST Sales Returns",
      "Electricity Bills",
      "Production Records",
    ],
  },
  {
    label: "Employment Documents",
    options: [
      "Employee Register",
      "EPFO Registration",
      "ESIC Registration",
      "Salary Register (if applicable)",
    ],
  },
  {
    label: "Other Documents",
    options: [
      "Plant Photographs",
      "Geo-tagged Photographs (if required)",
      "Affidavit / Self Declaration",
    ],
  },
];

export const DOCUMENT_TYPES: string[] = DOCUMENT_TYPE_GROUPS.flatMap((g) => g.options);

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

export const CATEGORIES = ["General", "OBC", "SC", "ST", "Minority"];
export const GENDERS = ["Male", "Female", "Other"];
export const INDUSTRIES = ["Manufacturing", "Service", "Trading", "Agriculture"];
export const SCHEME_CATEGORIES = ["All", "Startup", "MSME", "Manufacturing", "Agriculture", "Women", "Students"];
export const CONSULT_TYPES = [
  "Funding Guidance",
  "Government Schemes",
  "Business Loan Consultation",
  "Subsidy Consultation",
];
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 10; h <= 17; h++) {
    const minutes = h === 17 ? [0] : [0, 30];
    for (const m of minutes) {
      const displayH = h > 12 ? h - 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const min = m === 0 ? "00" : "30";
      slots.push(`${displayH}:${min} ${ampm}`);
    }
  }
  return slots;
}
export const TIME_SLOTS = generateTimeSlots();
// 10:00 AM → 5:00 PM, every 30 min (15 slots)

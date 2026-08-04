/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface ContactInquiry {
  company: string;
  contactName: string;
  email: string;
  companyWebsite?: string;
  role?: string;
  jobDescription: string;
  message?: string;
}

export interface ContactInquiryResponse {
  message: string;
}

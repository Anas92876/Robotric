import { api } from '../lib/api';

export interface JobApplication {
  _id: string;
  position: string;
  fullName: string;
  phone: string;
  email?: string;
  age?: number;
  location?: string;
  gender?: 'male' | 'female' | null;
  experienceLevel?: 'none' | 'beginner' | 'intermediate' | 'professional' | null;
  experienceDetails?: string;
  skills?: string[];
  portfolioLink?: string;
  availability?: 'full_time' | 'part_time' | 'flexible' | null;
  whyUs?: string;
  additionalInfo?: string;
  cvUrl?: string;
  cvBucket?: string;
  status: 'new' | 'reviewed' | 'interview' | 'accepted' | 'rejected';
  notes?: string;
  reviewedBy?: { _id: string; name: string; email: string } | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplicationFormData {
  position: string;
  fullName: string;
  phone: string;
  email?: string;
  age?: number | string;
  location?: string;
  gender?: string;
  experienceLevel?: string;
  experienceDetails?: string;
  skills?: string[];
  portfolioLink?: string;
  availability?: string;
  whyUs?: string;
  additionalInfo?: string;
  cvFile?: File | null;
}

export interface JobApplicationFilters {
  page?: number;
  limit?: number;
  status?: string;
  position?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface JobApplicationsResponse {
  success: boolean;
  data: JobApplication[];
  pagination: { total: number; page: number; pages: number; limit: number };
  stats: { total: number; new: number; reviewed: number; interview: number; accepted: number; rejected: number };
  positions: string[];
}

export const submitJobApplication = async (data: JobApplicationFormData) => {
  const formData = new FormData();

  formData.append('position', data.position);
  formData.append('fullName', data.fullName);
  formData.append('phone', data.phone);
  if (data.email)             formData.append('email', data.email);
  if (data.age != null)       formData.append('age', String(data.age));
  if (data.location)          formData.append('location', data.location);
  if (data.gender)            formData.append('gender', data.gender);
  if (data.experienceLevel)   formData.append('experienceLevel', data.experienceLevel);
  if (data.experienceDetails) formData.append('experienceDetails', data.experienceDetails);
  if (data.skills?.length)    formData.append('skills', JSON.stringify(data.skills));
  if (data.portfolioLink)     formData.append('portfolioLink', data.portfolioLink);
  if (data.availability)      formData.append('availability', data.availability);
  if (data.whyUs)             formData.append('whyUs', data.whyUs);
  if (data.additionalInfo)    formData.append('additionalInfo', data.additionalInfo);
  if (data.cvFile)            formData.append('cv', data.cvFile);

  const response = await api.post('/jobs/apply', formData, {
    skipAuth: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  } as any);
  return response.data;
};

export const getAllJobApplications = async (filters?: JobApplicationFilters): Promise<JobApplicationsResponse> => {
  const params = new URLSearchParams();
  if (filters?.page)     params.append('page', String(filters.page));
  if (filters?.limit)    params.append('limit', String(filters.limit));
  if (filters?.status)   params.append('status', filters.status);
  if (filters?.position) params.append('position', filters.position);
  if (filters?.search)   params.append('search', filters.search);
  if (filters?.fromDate) params.append('fromDate', filters.fromDate);
  if (filters?.toDate)   params.append('toDate', filters.toDate);
  const response = await api.get(`/reception/job-applications?${params.toString()}`);
  return response.data;
};

export const getJobApplicationById = async (id: string): Promise<JobApplication> => {
  const response = await api.get(`/reception/job-applications/${id}`);
  return response.data.data;
};

export const updateJobApplication = async (id: string, data: { status?: string; notes?: string }) => {
  const response = await api.put(`/reception/job-applications/${id}`, data);
  return response.data;
};

export const deleteJobApplication = async (id: string) => {
  const response = await api.delete(`/reception/job-applications/${id}`);
  return response.data;
};

export const downloadJobApplicationCv = async (id: string): Promise<{ signedUrl: string; filename: string }> => {
  const response = await api.get(`/reception/job-applications/${id}/cv`);
  return response.data.data;
};

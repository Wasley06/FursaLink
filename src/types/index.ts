export type UserRole = 'candidate' | 'controller' | 'admin';

export interface UserProfile {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  nationalId?: string;
  district?: string;
  ward?: string;
  education?: string;
  skills?: string;
  occupation?: string;
  experience?: number;
  cvUrl?: string;
  photoUrl?: string;
  profileProgress: number;
  createdAt: any;
  updatedAt: any;
}

export type JobStatus = 'published' | 'unpublished' | 'paused' | 'closed';

export interface Job {
  id: string;
  title: string;
  description: string;
  qualifications: string;
  deadline: any;
  district: string;
  occupation: string;
  status: JobStatus;
  department?: string;
  salary?: string;
  controllerId: string;
  createdAt: any;
  updatedAt: any;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'shortlisted';

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  status: ApplicationStatus;
  notes?: string;
  appliedAt: any;
  updatedAt: any;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'notice' | 'seminar' | 'workshop';
  audience: string;
  controllerId: string;
  createdAt: any;
}

export interface Ad {
  id: string;
  title: string;
  content?: string;
  imageUrl: string;
  startDate: any;
  endDate: any;
  targetAudience?: string;
  targetDistrict?: string;
  controllerId: string;
  createdAt: any;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  subject?: string;
  read: boolean;
  createdAt: any;
}

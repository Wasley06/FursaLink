export type UserRole = 'candidate' | 'controller' | 'chairman' | 'developer';
// Back-compat for older documents and UI code
export type StoredUserRole = UserRole | 'admin';

export interface UserProfile {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: StoredUserRole;
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

export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  status: CourseStatus;
  startDate?: any;
  endDate?: any;
  capacity?: number;
  createdBy: string; // controllerId or adminId
  createdAt: any;
  updatedAt: any;
}

export type EventType = 'seminar' | 'campaign';

export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  status: 'draft' | 'published' | 'archived';
  location?: string;
  startAt?: any;
  endAt?: any;
  capacity?: number;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  status: 'booked' | 'cancelled';
  createdAt: any;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'enrolled' | 'completed' | 'cancelled';
  createdAt: any;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  applicationId?: string;
  userId: string;
  occupation?: string;
  district?: string;
  controllerId: string;
  status: ApprovalStatus;
  notes?: string;
  decidedAt?: any;
  createdAt: any;
  updatedAt: any;
}

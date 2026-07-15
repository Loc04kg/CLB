
export type UserRole = 'ADMIN' | 'LEADER' | 'MEMBER' | 'STUDENT';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  studentId: string;
  name: string;
  email: string;
  role: UserRole;
  faceImage?: string;
  major?: string;
  interests?: string;
  skills?: string;
  bio?: string;
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  founder_id: string;
  status: RequestStatus;
  logo_url?: string;
  created_at: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'LEADER' | 'MEMBER';
  join_date: string;
}

export interface Event {
  id: string;
  club_id: string;
  title: string;
  description: string;
  location: string;
  event_date: string;
  status: RequestStatus;
  created_at: string;
}

export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  checkin_time: string;
  method: 'FACEID' | 'MANUAL';
}

export interface AILog {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
}

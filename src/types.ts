/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index in the options array (0 to 3)
}

export interface Test {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  questions: Question[];
  category: string; // 'Aptitude' | 'Verbal' | 'Logical' | 'Coding' | 'Technical'
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'student' | 'admin' | 'faculty';
  name: string;
  email: string;
  approved?: boolean;
  branchType?: string;
  department?: string;
}

export interface TestResult {
  id: string;
  userId: string;
  username: string;
  studentName: string;
  testId: string;
  testTitle: string;
  category: string;
  score: number;
  totalQuestions: number;
  submittedAt: string;
  answers: Record<string, number>; // questionId -> chosenOptionIndex
}

export interface TrainingResource {
  id: string;
  title: string;
  category: string;
  type: 'Article' | 'Cheatsheet' | 'Interactive' | 'Guide';
  content: string;
  readTime: string;
  tags: string[];
}

export interface PlacementDrive {
  id: string;
  company: string;
  role: string;
  salaryPackage: string; // e.g. "$12,000 / Year" or "₹12 LPA"
  eligibility: string;
  date: string;
  status: 'Open' | 'Upcoming' | 'Closed';
}

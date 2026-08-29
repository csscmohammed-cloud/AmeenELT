export type UserRole = 'teacher' | 'student';
export type UserStatus = 'pending' | 'approved' | 'suspended';

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  name: string;
  universityId: string;
  role: UserRole;
  status: UserStatus;
  approved?: boolean;
  createdAt: number;
  year?: string;
  section?: string;
  faculty?: string;
  department?: string;
  xp?: number;
  points?: number;
  badges?: string[];
  groupIds?: string[];
}

export interface Group {
  id?: string;
  name: string;
  year?: string;
  level?: string;
  batch?: string;
  createdAt: number;
  createdBy: string;
}

export type MaterialType = 'quiz' | 'pronunciation' | 'course' | 'interactive-course';

export interface Material {
  id?: string;
  type: MaterialType;
  title: string;
  topic: string;
  cefrLevel?: string;
  folder?: string;
  tags?: string[];
  content: any; // specific content based on type
  createdAt: number;
  createdBy: string;
  assignedGroups?: string[]; // Empty means 'all'
  assignedUsers?: string[]; // specific student UIDs
  dueDate?: number;
  allowRetakes?: boolean;
}

export interface PronunciationContent {
  passage: string;
  measures?: string[];
}

// Sub-types for content
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  questionType?: 'multiple-choice' | 'fill-in-the-blank' | 'true-false' | 'short-answer';
  explanation?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video' | 'none';
  ttsText?: string;
}


export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  type?: string;
  link?: string;
}

export interface Attempt {
  id?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  materialId: string;
  type: string;
  score: number | null;
  totalQuestions: number;
  completedAt: number;
  aiScore?: number;
  aiFeedback?: string;
  audioUrl?: string; // Stored as base64 for now for simplicity, or we skip audioUrl and just have aiFeedback
}

export interface SharedFile {
  id?: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: number;
  folder?: string;
  targetType?: 'student' | 'group' | 'class';
  targetId?: string; // studentId, groupId, or empty
  isSubmission?: boolean;
  description?: string;
}

export interface CourseModule {
  id?: string;
  title: string;
  description?: string;
  type?: 'video' | 'reading' | 'quiz' | 'interactive';
  content: string;
  order?: number;
}

export type AIProvider = 'openrouter' | 'custom';

export interface AICustomBackupConfig {
  enabled: boolean;
  apiKey: string;
  maskedKey?: string;
  baseUrl: string;
  model: string;
  name?: string;
  hasKey?: boolean;
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maskedKey?: string;
  status?: 'active' | 'invalid' | 'unconfigured';
}

export interface AIConfigResponse {
  provider: AIProvider;
  model: string;
  maskedKey: string;
  hasKey: boolean;
  baseUrl?: string;
  isCustom: boolean;
  status: 'active' | 'invalid' | 'unconfigured';
  backupConfig?: AICustomBackupConfig;
  availableProviders: {
    id: AIProvider;
    name: string;
    description: string;
    defaultModel: string;
    models: string[];
    keyPlaceholder: string;
    helpUrl: string;
    prefixHint?: string;
  }[];
}

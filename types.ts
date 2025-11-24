export enum JobRole {
  MARKETING = 'Marketing Executive',
  SDE_INTERN = 'Software Development Intern',
  SDE_JOB = 'Software Developer (Full Time)'
}

export enum Language {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  BENGALI = 'Bengali'
}

export interface InterviewConfig {
  name: string;
  role: JobRole;
  language: Language;
}

export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface InterviewResult {
  passed: boolean;
  notes?: string;
  transcript: TranscriptEntry[];
}

export const JOB_DESCRIPTIONS: Record<JobRole, string> = {
  [JobRole.MARKETING]: "Target Profile: A dynamic Marketing Executive. \nKey Skills: Digital marketing (SEO, SEM, PPC), Content Strategy, Social Media Management (LinkedIn, Twitter, Instagram), Brand Positioning, Market Research, and Crisis Communication. \nScenario: Ask about handling a PR crisis on social media, or how they would launch a product with zero budget. \nTrait: Look for high energy, persuasive communication, and data-driven creativity.",
  [JobRole.SDE_INTERN]: "Target Profile: Smart, eager-to-learn Software Development Intern. \nKey Skills: Data Structures & Algorithms (Arrays, Linked Lists, Trees), OOPs concepts (Polymorphism, Inheritance), Basic Web Dev (HTML/CSS/JS), Database basics (SQL). \nScenario: Ask how to reverse a linked list, or explain the difference between a process and a thread. \nTrait: Look for problem-solving aptitude (not just right answers) and eagerness to learn.",
  [JobRole.SDE_JOB]: "Target Profile: Experienced Full Stack Developer. \nKey Skills: System Design (Scalability, Load Balancing), Backend (Node.js/Express, Microservices), Frontend (React.js, State Management, SSR), Cloud (AWS/Docker/Kubernetes), and CI/CD pipelines. \nScenario: Ask to design a URL shortener system or handle database migration with zero downtime. \nTrait: Look for architectural depth, coding standards, and experience with production issues."
};
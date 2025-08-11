
// Grade types based on Excel file
export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'IC';

// Status types for components and quadrants
export type StatusType = 'Good' | 'Progress' | 'Deteriorate' | 'Cleared' | 'Not Cleared' | 'Attendance Shortage' | 'IC' | 'Not Scored';

export interface Microcompetency {
  id: string;
  name: string;
  description: string;
  score?: number;
  maxScore: number;
  weightage: number;
  feedback?: string;
  status?: StatusType;
  scoredAt?: string | null;
  scoredBy?: string | null;
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  score: number;
  maxScore: number;
  weightage?: number;
  status?: StatusType;
  category?: 'SHL' | 'Professional' | 'Academic' | 'Physical' | 'Mental' | 'Social' | 'Conduct'; // Extended categories
  microcompetencies?: Microcompetency[];
}

export interface SubCategory {
  id: string;
  name: string;
  description?: string;
  weightage: number;
  obtained: number;
  maxScore: number;
  components: Component[];
}

export interface QuadrantData {
  id: string;
  name: string;
  description?: string;
  weightage: number;
  obtained: number;
  maxScore: number; // Maximum possible score for this quadrant
  components: Component[]; // Legacy flat structure
  sub_categories?: SubCategory[]; // NEW: Hierarchical structure
  status: StatusType;
  attendance?: number; // Attendance percentage
  eligibility?: 'Eligible' | 'Not Eligible'; // Eligibility status
  rank?: number; // Rank within the batch for this quadrant
}

export interface TestScore {
  id: string;
  name: string;
  scores: number[];
  total: number;
  maxScore: number;
}

export interface TermData {
  termId: string; // e.g., "Term1", "Term2"
  termName: string; // e.g., "Term 1 / Level 0"
  quadrants: QuadrantData[];
  tests: TestScore[];
  totalScore: number;
  grade: Grade;
  overallStatus: StatusType;
}

export interface Student {
  id: string;
  name: string;
  registrationNo: string;
  course: string;
  batch: string;
  section: string;
  houseName?: string;
  gender: 'Male' | 'Female' | 'Other';
  currentTerm: string; // Reference to the current term ID
  terms: TermData[]; // All terms data
  totalScore: number; // Current term score
  grade: Grade; // Current term grade
  overallStatus: StatusType; // Current term status
  quadrants: QuadrantData[]; // Current term quadrants (for backward compatibility)
  tests: TestScore[]; // Current term tests (for backward compatibility)
}

export interface Leaderboard {
  overall: {
    topStudents: { id: string; name: string; score: number }[];
    userRank: number;
    batchAvg: number;
    batchBest: number;
  };
  quadrants: Record<string, {
    topStudents: { id: string; name: string; score: number }[];
    userRank: number;
    batchAvg: number;
    batchBest: number;
  }>;
}

// Helper function to calculate grade based on score
const calculateGrade = (score: number): Grade => {
  if (score >= 80) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  if (score >= 30) return 'E';
  return 'IC';
};

// Helper function to calculate status based on score and threshold
const calculateStatus = (score: number, threshold: number): StatusType => {
  if (score >= threshold * 0.8) return 'Good';
  if (score >= threshold * 0.6) return 'Progress';
  return 'Deteriorate';
};

// Mock data based on the Excel file
export const studentData: Student = {
  id: "2024-Ajith",
  name: "Ajith",
  registrationNo: "2334",
  course: "PGDM",
  batch: "2024",
  section: "A",
  houseName: "Daredevils",
  gender: "Male",
  currentTerm: "Term1",
  totalScore: 95,
  grade: "A+",
  overallStatus: "Good",
  terms: [
    {
      termId: "Term1",
      termName: "Term 1 / Level 0",
      totalScore: 95,
      grade: "A+",
      overallStatus: "Good",
      quadrants: [
        {
          id: "persona",
          name: "Persona",
          weightage: 50, // Updated to match Excel (50 instead of 40)
          obtained: 45,
          maxScore: 50, // Maximum possible score for this quadrant
          status: "Cleared",
          attendance: 90,
          eligibility: "Eligible",
          rank: 1,
          components: [
            // SHL Competencies (80%)
            {
              id: "anc",
              name: "Analysis & Critical Thinking (A&C)",
              score: 4,
              maxScore: 5,
              category: "SHL",
              microcompetencies: [
                { id: "anc-1", name: "Problem Analysis", description: "Ability to break down complex problems", score: 8, maxScore: 10, weightage: 25, feedback: "Good analytical skills demonstrated", status: "Good" },
                { id: "anc-2", name: "Solution Development", description: "Creating effective solutions to problems", score: 7, maxScore: 10, weightage: 25, feedback: "Room for improvement in creative solutions", status: "Progress" },
                { id: "anc-3", name: "Decision Making", description: "Making informed and timely decisions", score: 9, maxScore: 10, weightage: 25, feedback: "Excellent decision-making abilities", status: "Good" },
                { id: "anc-4", name: "Logical Reasoning", description: "Using logic and reasoning in analysis", score: 8, maxScore: 10, weightage: 25, feedback: "Strong logical thinking", status: "Good" }
              ]
            },
            {
              id: "c",
              name: "Communication (C)",
              score: 4,
              maxScore: 5,
              category: "SHL",
              microcompetencies: [
                { id: "c-1", name: "Verbal Communication", description: "Effective spoken communication skills", score: 8, maxScore: 10, weightage: 30, feedback: "Clear and articulate speaker", status: "Good" },
                { id: "c-2", name: "Written Communication", description: "Clear and effective writing skills", score: 7, maxScore: 10, weightage: 30, feedback: "Good writing, minor grammar issues", status: "Progress" },
                { id: "c-3", name: "Presentation Skills", description: "Ability to present ideas effectively", score: 9, maxScore: 10, weightage: 25, feedback: "Excellent presentation delivery", status: "Good" },
                { id: "c-4", name: "Active Listening", description: "Listening and understanding others", score: 8, maxScore: 10, weightage: 15, feedback: "Good listening skills", status: "Good" }
              ]
            },
            { id: "e", name: "Empathy (E)", score: 5, maxScore: 5, category: "SHL" },
            { id: "l", name: "Leadership (L)", score: 5, maxScore: 5, category: "SHL" },
            { id: "n", name: "Negotiation (N)", score: 4, maxScore: 5, category: "SHL" },
            { id: "p", name: "Problem Solving (P)", score: 5, maxScore: 5, category: "SHL" },
            { id: "t", name: "Teamwork (T)", score: 4, maxScore: 5, category: "SHL" },
            // Professional Readiness (20%)
            { id: "espa", name: "ESPA", score: 8, maxScore: 10, category: "Professional" },
            { id: "aptitude", name: "Aptitude", score: 2, maxScore: 2.5, category: "Professional" },
            { id: "functional", name: "Functional Readiness", score: 2, maxScore: 2.5, category: "Professional" },
            { id: "tech", name: "Tech Readiness", score: 2, maxScore: 2.5, category: "Professional" },
            { id: "case", name: "Case Analysis", score: 2, maxScore: 2.5, category: "Professional" }
          ]
        },
        {
          id: "wellness",
          name: "Wellness",
          weightage: 30,
          obtained: 28,
          maxScore: 30,
          status: "Cleared",
          attendance: 85,
          eligibility: "Eligible",
          rank: 7,
          components: [
            {
              id: "push-ups",
              name: "Push Ups",
              score: 4,
              maxScore: 5,
              status: "Good",
              microcompetencies: [
                { id: "pu-1", name: "Upper Body Strength", description: "Strength in chest, shoulders, and arms", score: 8, maxScore: 10, weightage: 50, feedback: "Good strength development", status: "Good" },
                { id: "pu-2", name: "Endurance", description: "Ability to maintain performance over time", score: 7, maxScore: 10, weightage: 30, feedback: "Needs improvement in endurance", status: "Progress" },
                { id: "pu-3", name: "Form & Technique", description: "Proper push-up form and technique", score: 9, maxScore: 10, weightage: 20, feedback: "Excellent form", status: "Good" }
              ]
            },
            { id: "sit-ups", name: "Sit Ups", score: 4, maxScore: 5, status: "Good" },
            { id: "sit-reach", name: "Sit & Reach", score: 3, maxScore: 5, status: "Progress" },
            { id: "beep-test", name: "Beep Test", score: 4, maxScore: 5, status: "Good" },
            { id: "bca", name: "Body Composition Analysis", score: 4, maxScore: 5, status: "Good" },
            { id: "run", name: "3KM Run", score: 3, maxScore: 5, status: "Progress" }
          ]
        },
        {
          id: "behavior",
          name: "Behavior",
          weightage: 10, // Updated to match Excel (10 instead of 20)
          obtained: 9,
          maxScore: 10,
          status: "Cleared",
          components: [
            {
              id: "prepares-class",
              name: "Prepares for Class",
              score: 3,
              maxScore: 5,
              microcompetencies: [
                { id: "pc-1", name: "Pre-reading", description: "Completes assigned readings before class", score: 6, maxScore: 10, weightage: 40, feedback: "Inconsistent with pre-reading", status: "Progress" },
                { id: "pc-2", name: "Note Taking", description: "Takes comprehensive notes during class", score: 8, maxScore: 10, weightage: 30, feedback: "Good note-taking habits", status: "Good" },
                { id: "pc-3", name: "Question Preparation", description: "Comes prepared with thoughtful questions", score: 5, maxScore: 10, weightage: 30, feedback: "Needs to prepare more questions", status: "Progress" }
              ]
            },
            { id: "participation", name: "Participates in Class Discussions", score: 3, maxScore: 5 },
            { id: "manners", name: "Demonstrates Good Manners", score: 3, maxScore: 5 },
            { id: "punctuality", name: "Arrives on Time and is Properly Groomed", score: 3, maxScore: 5 },
            { id: "assignments", name: "Submits Good Quality Assignments", score: 3, maxScore: 5 }
          ]
        },
        {
          id: "discipline",
          name: "Discipline",
          weightage: 10,
          obtained: 8,
          maxScore: 10,
          status: "Cleared",
          components: [
            { id: "attendance", name: "Overall Attendance", score: 90, maxScore: 100 },
            { id: "wellness-attendance", name: "Wellness Attendance", score: 85, maxScore: 100 },
            { id: "regularity", name: "Regularity", score: 4, maxScore: 5 },
            { id: "preparedness", name: "Preparedness", score: 3, maxScore: 5 },
            { id: "meeting-deadlines", name: "Meeting Deadlines", score: 4, maxScore: 5 },
            { id: "participation", name: "Participation", score: 4, maxScore: 5 }
          ]
        }
      ],
      tests: [
        {
          id: "espa",
          name: "ESPA (40 Marks)",
          scores: [22, 10, 34, 22, 11, 18, 18, 16, 26],
          total: 20,
          maxScore: 40
        },
        {
          id: "tech",
          name: "Tech Readiness (100)",
          scores: [67, 33, 27, 65, 47, 32, 78, 44, 12],
          total: 45,
          maxScore: 100
        },
        {
          id: "case",
          name: "Case Analysis (100)",
          scores: [33, 53, 23, 25, 35, 40, 44, 34, 67],
          total: 40,
          maxScore: 100
        },
        {
          id: "functional",
          name: "Functional Knowledge (100)",
          scores: [31, 14, 14, 0, 23, 12, 45, 32, 67],
          total: 26,
          maxScore: 100
        }
      ]
    },
    {
      termId: "Term2",
      termName: "Term 2 / Level 1",
      totalScore: 90,
      grade: "A+",
      overallStatus: "Good",
      quadrants: [
        {
          id: "persona",
          name: "Persona",
          weightage: 50,
          obtained: 42,
          status: "Cleared",
          attendance: 88,
          eligibility: "Eligible",
          rank: 3,
          components: [
            // SHL Competencies (80%)
            { id: "anc", name: "Analysis & Critical Thinking (A&C)", score: 3, maxScore: 5, category: "SHL" },
            { id: "c", name: "Communication (C)", score: 4, maxScore: 5, category: "SHL" },
            { id: "e", name: "Empathy (E)", score: 4, maxScore: 5, category: "SHL" },
            { id: "l", name: "Leadership (L)", score: 4, maxScore: 5, category: "SHL" },
            { id: "n", name: "Negotiation (N)", score: 4, maxScore: 5, category: "SHL" },
            { id: "p", name: "Problem Solving (P)", score: 4, maxScore: 5, category: "SHL" },
            { id: "t", name: "Teamwork (T)", score: 4, maxScore: 5, category: "SHL" },
            // Professional Readiness (20%)
            { id: "espa", name: "ESPA", score: 7, maxScore: 10, category: "Professional" },
            { id: "aptitude", name: "Aptitude", score: 2, maxScore: 2.5, category: "Professional" },
            { id: "functional", name: "Functional Readiness", score: 2, maxScore: 2.5, category: "Professional" },
            { id: "tech", name: "Tech Readiness", score: 2, maxScore: 2.5, category: "Professional" },
            { id: "case", name: "Case Analysis", score: 2, maxScore: 2.5, category: "Professional" }
          ]
        },
        {
          id: "wellness",
          name: "Wellness",
          weightage: 30,
          obtained: 26,
          maxScore: 30,
          status: "Cleared",
          attendance: 82,
          eligibility: "Eligible",
          rank: 10,
          components: [
            { id: "push-ups", name: "Push Ups", score: 4, maxScore: 5, status: "Good" },
            { id: "sit-ups", name: "Sit Ups", score: 3, maxScore: 5, status: "Progress" },
            { id: "sit-reach", name: "Sit & Reach", score: 3, maxScore: 5, status: "Progress" },
            { id: "beep-test", name: "Beep Test", score: 4, maxScore: 5, status: "Good" },
            { id: "bca", name: "Body Composition Analysis", score: 4, maxScore: 5, status: "Good" },
            { id: "run", name: "3KM Run", score: 4, maxScore: 5, status: "Good" }
          ]
        },
        {
          id: "behavior",
          name: "Behavior",
          weightage: 10,
          obtained: 8,
          maxScore: 10,
          status: "Cleared",
          components: [
            { id: "prepares-class", name: "Prepares for Class", score: 4, maxScore: 5 },
            { id: "participation", name: "Participates in Class Discussions", score: 4, maxScore: 5 },
            { id: "manners", name: "Demonstrates Good Manners", score: 3, maxScore: 5 },
            { id: "punctuality", name: "Arrives on Time and is Properly Groomed", score: 4, maxScore: 5 },
            { id: "assignments", name: "Submits Good Quality Assignments", score: 4, maxScore: 5 }
          ]
        },
        {
          id: "discipline",
          name: "Discipline",
          weightage: 10,
          obtained: 9,
          maxScore: 10,
          status: "Cleared",
          components: [
            { id: "attendance", name: "Overall Attendance", score: 88, maxScore: 100 },
            { id: "wellness-attendance", name: "Wellness Attendance", score: 82, maxScore: 100 },
            { id: "regularity", name: "Regularity", score: 4, maxScore: 5 },
            { id: "preparedness", name: "Preparedness", score: 4, maxScore: 5 },
            { id: "meeting-deadlines", name: "Meeting Deadlines", score: 4, maxScore: 5 },
            { id: "participation", name: "Participation", score: 5, maxScore: 5 }
          ]
        }
      ],
      tests: [
        {
          id: "espa",
          name: "ESPA (40 Marks)",
          scores: [25, 15, 30, 25, 15, 20, 20, 18, 28],
          total: 25,
          maxScore: 40
        },
        {
          id: "tech",
          name: "Tech Readiness (100)",
          scores: [70, 40, 35, 70, 50, 40, 80, 50, 20],
          total: 50,
          maxScore: 100
        },
        {
          id: "case",
          name: "Case Analysis (100)",
          scores: [40, 60, 30, 35, 40, 45, 50, 40, 70],
          total: 45,
          maxScore: 100
        },
        {
          id: "functional",
          name: "Functional Knowledge (100)",
          scores: [40, 25, 25, 10, 30, 20, 50, 40, 70],
          total: 35,
          maxScore: 100
        }
      ]
    },
    {
      termId: "Term3",
      termName: "Term 3 / Level 2",
      totalScore: 89,
      grade: "A+",
      overallStatus: "Good",
      quadrants: [
        {
          id: "persona",
          name: "Persona",
          weightage: 50,
          obtained: 44,
          status: "Cleared",
          attendance: 92,
          eligibility: "Eligible",
          rank: 2,
          components: [
            // SHL Competencies (80%)
            { id: "anc", name: "Analysis & Critical Thinking (A&C)", score: 4, maxScore: 5, category: "SHL" },
            { id: "c", name: "Communication (C)", score: 4, maxScore: 5, category: "SHL" },
            { id: "e", name: "Empathy (E)", score: 5, maxScore: 5, category: "SHL" },
            { id: "l", name: "Leadership (L)", score: 5, maxScore: 5, category: "SHL" },
            { id: "n", name: "Negotiation (N)", score: 4, maxScore: 5, category: "SHL" },
            { id: "p", name: "Problem Solving (P)", score: 5, maxScore: 5, category: "SHL" },
            { id: "t", name: "Teamwork (T)", score: 4, maxScore: 5, category: "SHL" },
            // Professional Readiness (20%)
            { id: "espa", name: "ESPA", score: 8, maxScore: 10, category: "Professional" },
            { id: "aptitude", name: "Aptitude", score: 2, maxScore: 2.5, category: "Professional" },
            { id: "functional", name: "Functional Readiness", score: 2, maxScore: 2.5, category: "Professional" },
            { id: "tech", name: "Tech Readiness", score: 2, maxScore: 2.5, category: "Professional" },
            { id: "case", name: "Case Analysis", score: 2, maxScore: 2.5, category: "Professional" }
          ]
        },
        {
          id: "wellness",
          name: "Wellness",
          weightage: 30,
          obtained: 27,
          maxScore: 30,
          status: "Cleared",
          attendance: 88,
          eligibility: "Eligible",
          rank: 5,
          components: [
            { id: "push-ups", name: "Push Ups", score: 4, maxScore: 5, status: "Good" },
            { id: "sit-ups", name: "Sit Ups", score: 4, maxScore: 5, status: "Good" },
            { id: "sit-reach", name: "Sit & Reach", score: 4, maxScore: 5, status: "Good" },
            { id: "beep-test", name: "Beep Test", score: 4, maxScore: 5, status: "Good" },
            { id: "bca", name: "Body Composition Analysis", score: 4, maxScore: 5, status: "Good" },
            { id: "run", name: "3KM Run", score: 4, maxScore: 5, status: "Good" }
          ]
        },
        {
          id: "behavior",
          name: "Behavior",
          weightage: 10,
          obtained: 9,
          maxScore: 10,
          status: "Cleared",
          components: [
            { id: "prepares-class", name: "Prepares for Class", score: 4, maxScore: 5 },
            { id: "participation", name: "Participates in Class Discussions", score: 4, maxScore: 5 },
            { id: "manners", name: "Demonstrates Good Manners", score: 4, maxScore: 5 },
            { id: "punctuality", name: "Arrives on Time and is Properly Groomed", score: 4, maxScore: 5 },
            { id: "assignments", name: "Submits Good Quality Assignments", score: 4, maxScore: 5 }
          ]
        },
        {
          id: "discipline",
          name: "Discipline",
          weightage: 10,
          obtained: 9,
          maxScore: 10,
          status: "Cleared",
          components: [
            { id: "attendance", name: "Overall Attendance", score: 92, maxScore: 100 },
            { id: "wellness-attendance", name: "Wellness Attendance", score: 88, maxScore: 100 },
            { id: "regularity", name: "Regularity", score: 4, maxScore: 5 },
            { id: "preparedness", name: "Preparedness", score: 4, maxScore: 5 },
            { id: "meeting-deadlines", name: "Meeting Deadlines", score: 5, maxScore: 5 },
            { id: "participation", name: "Participation", score: 5, maxScore: 5 }
          ]
        }
      ],
      tests: []
    }
  ],
  // For backward compatibility
  quadrants: [
    {
      id: "persona",
      name: "Persona",
      weightage: 50, // Updated to match Excel (50 instead of 40)
      obtained: 45,
      status: "Cleared",
      attendance: 90,
      eligibility: "Eligible",
      rank: 1,
      components: [
        // SHL Competencies (80%)
        { id: "anc", name: "Analysis & Critical Thinking (A&C)", score: 4, maxScore: 5, category: "SHL" },
        { id: "c", name: "Communication (C)", score: 4, maxScore: 5, category: "SHL" },
        { id: "e", name: "Empathy (E)", score: 5, maxScore: 5, category: "SHL" },
        { id: "l", name: "Leadership (L)", score: 5, maxScore: 5, category: "SHL" },
        { id: "n", name: "Negotiation (N)", score: 4, maxScore: 5, category: "SHL" },
        { id: "p", name: "Problem Solving (P)", score: 5, maxScore: 5, category: "SHL" },
        { id: "t", name: "Teamwork (T)", score: 4, maxScore: 5, category: "SHL" },
        // Professional Readiness (20%)
        { id: "espa", name: "ESPA", score: 8, maxScore: 10, category: "Professional" },
        { id: "aptitude", name: "Aptitude", score: 2, maxScore: 2.5, category: "Professional" },
        { id: "functional", name: "Functional Readiness", score: 2, maxScore: 2.5, category: "Professional" },
        { id: "tech", name: "Tech Readiness", score: 2, maxScore: 2.5, category: "Professional" },
        { id: "case", name: "Case Analysis", score: 2, maxScore: 2.5, category: "Professional" }
      ]
    },
    {
      id: "wellness",
      name: "Wellness",
      weightage: 30,
      obtained: 28,
      maxScore: 30,
      status: "Cleared",
      attendance: 85,
      eligibility: "Eligible",
      rank: 7,
      components: [
        { id: "push-ups", name: "Push Ups", score: 4, maxScore: 5, status: "Good" },
        { id: "sit-ups", name: "Sit Ups", score: 4, maxScore: 5, status: "Good" },
        { id: "sit-reach", name: "Sit & Reach", score: 3, maxScore: 5, status: "Progress" },
        { id: "beep-test", name: "Beep Test", score: 4, maxScore: 5, status: "Good" },
        { id: "bca", name: "Body Composition Analysis", score: 4, maxScore: 5, status: "Good" },
        { id: "run", name: "3KM Run", score: 3, maxScore: 5, status: "Progress" }
      ]
    },
    {
      id: "behavior",
      name: "Behavior",
      weightage: 10, // Updated to match Excel (10 instead of 20)
      obtained: 9,
      maxScore: 10,
      status: "Cleared",
      components: [
        { id: "prepares-class", name: "Prepares for Class", score: 3, maxScore: 5 },
        { id: "participation", name: "Participates in Class Discussions", score: 3, maxScore: 5 },
        { id: "manners", name: "Demonstrates Good Manners", score: 3, maxScore: 5 },
        { id: "punctuality", name: "Arrives on Time and is Properly Groomed", score: 3, maxScore: 5 },
        { id: "assignments", name: "Submits Good Quality Assignments", score: 3, maxScore: 5 }
      ]
    },
    {
      id: "discipline",
      name: "Discipline",
      weightage: 10,
      obtained: 8,
      maxScore: 10,
      status: "Cleared",
      components: [
        { id: "attendance", name: "Overall Attendance", score: 90, maxScore: 100 },
        { id: "wellness-attendance", name: "Wellness Attendance", score: 85, maxScore: 100 },
        { id: "regularity", name: "Regularity", score: 4, maxScore: 5 },
        { id: "preparedness", name: "Preparedness", score: 3, maxScore: 5 },
        { id: "meeting-deadlines", name: "Meeting Deadlines", score: 4, maxScore: 5 },
        { id: "participation", name: "Participation", score: 4, maxScore: 5 }
      ]
    }
  ],
  tests: [
    {
      id: "espa",
      name: "ESPA (40 Marks)",
      scores: [22, 10, 34, 22, 11, 18, 18, 16, 26],
      total: 20,
      maxScore: 40
    },
    {
      id: "tech",
      name: "Tech Readiness (100)",
      scores: [67, 33, 27, 65, 47, 32, 78, 44, 12],
      total: 45,
      maxScore: 100
    },
    {
      id: "case",
      name: "Case Analysis (100)",
      scores: [33, 53, 23, 25, 35, 40, 44, 34, 67],
      total: 40,
      maxScore: 100
    },
    {
      id: "functional",
      name: "Functional Knowledge (100)",
      scores: [31, 14, 14, 0, 23, 12, 45, 32, 67],
      total: 26,
      maxScore: 100
    }
  ]
};

// Mock leaderboard data
export const leaderboardData: Leaderboard = {
  overall: {
    topStudents: [
      { id: "2024-Student1", name: "Rohan S", score: 97 },
      { id: "2024-Student2", name: "Priya M", score: 96 },
      { id: "2024-Ajith", name: "Ajith", score: 95 }
    ],
    userRank: 3,
    batchAvg: 82,
    batchBest: 97
  },
  quadrants: {
    persona: {
      topStudents: [
        { id: "2024-Student1", name: "Rohan S", score: 40 },
        { id: "2024-Student2", name: "Priya M", score: 39 },
        { id: "2024-Student3", name: "Kavita R", score: 39 }
      ],
      userRank: 4,
      batchAvg: 35,
      batchBest: 40
    },
    wellness: {
      topStudents: [
        { id: "2024-Student4", name: "Arjun K", score: 30 },
        { id: "2024-Student5", name: "Divya P", score: 29 },
        { id: "2024-Student6", name: "Rahul M", score: 29 }
      ],
      userRank: 5,
      batchAvg: 26,
      batchBest: 30
    },
    behavior: {
      topStudents: [
        { id: "2024-Ajith", name: "Ajith", score: 20 },
        { id: "2024-Student7", name: "Karthik L", score: 20 },
        { id: "2024-Student8", name: "Meena S", score: 19 }
      ],
      userRank: 1,
      batchAvg: 17,
      batchBest: 20
    },
    discipline: {
      topStudents: [
        { id: "2024-Student9", name: "Vishal R", score: 10 },
        { id: "2024-Student10", name: "Ananya K", score: 10 },
        { id: "2024-Student11", name: "Suresh P", score: 9 }
      ],
      userRank: 4,
      batchAvg: 8,
      batchBest: 10
    }
  }
};

// Mock student list for admin search
export const studentList = [
  studentData,
  {
    id: "2024-Rohan",
    name: "Rohan S",
    registrationNo: "2335",
    course: "PGDM",
    batch: "2024",
    section: "A",
    houseName: "Coronation",
    gender: "Male",
    currentTerm: "Term1",
    totalScore: 97,
    grade: "A+",
    overallStatus: "Good",
    terms: [
      {
        termId: "Term1",
        termName: "Term 1 / Level 0",
        totalScore: 97,
        grade: "A+",
        overallStatus: "Good",
        quadrants: [],
        tests: []
      }
    ],
    quadrants: [],
    tests: []
  },
  {
    id: "2024-Priya",
    name: "Priya M",
    registrationNo: "2336",
    course: "PGDM",
    batch: "2024",
    section: "B",
    houseName: "Apache",
    gender: "Female",
    currentTerm: "Term1",
    totalScore: 96,
    grade: "A+",
    overallStatus: "Good",
    terms: [
      {
        termId: "Term1",
        termName: "Term 1 / Level 0",
        totalScore: 96,
        grade: "A+",
        overallStatus: "Good",
        quadrants: [],
        tests: []
      }
    ],
    quadrants: [],
    tests: []
  },
  {
    id: "2024-Kavita",
    name: "Kavita R",
    registrationNo: "2337",
    course: "PGDM",
    batch: "2024",
    section: "C",
    houseName: "Bravehearts",
    gender: "Female",
    currentTerm: "Term1",
    totalScore: 94,
    grade: "A+",
    overallStatus: "Good",
    terms: [
      {
        termId: "Term1",
        termName: "Term 1 / Level 0",
        totalScore: 94,
        grade: "A+",
        overallStatus: "Good",
        quadrants: [],
        tests: []
      }
    ],
    quadrants: [],
    tests: []
  },
  {
    id: "2024-Arjun",
    name: "Arjun K",
    registrationNo: "2338",
    course: "PGDM",
    batch: "2024",
    section: "D",
    houseName: "Daredevils",
    gender: "Male",
    currentTerm: "Term1",
    totalScore: 93,
    grade: "A+",
    overallStatus: "Good",
    terms: [
      {
        termId: "Term1",
        termName: "Term 1 / Level 0",
        totalScore: 93,
        grade: "A+",
        overallStatus: "Good",
        quadrants: [],
        tests: []
      }
    ],
    quadrants: [],
    tests: []
  },
  {
    id: "2024-Neha",
    name: "Neha P",
    registrationNo: "2339",
    course: "PGDM",
    batch: "2024",
    section: "A",
    houseName: "Coronation",
    gender: "Female",
    currentTerm: "Term1",
    totalScore: 85,
    grade: "A+",
    overallStatus: "Good",
    terms: [
      {
        termId: "Term1",
        termName: "Term 1 / Level 0",
        totalScore: 85,
        grade: "A+",
        overallStatus: "Good",
        quadrants: [],
        tests: []
      }
    ],
    quadrants: [],
    tests: []
  },
  {
    id: "2024-Rahul",
    name: "Rahul S",
    registrationNo: "2340",
    course: "PGDM",
    batch: "2024",
    section: "B",
    houseName: "Apache",
    gender: "Male",
    currentTerm: "Term1",
    totalScore: 78,
    grade: "A",
    overallStatus: "Good",
    terms: [
      {
        termId: "Term1",
        termName: "Term 1 / Level 0",
        totalScore: 78,
        grade: "A",
        overallStatus: "Good",
        quadrants: [],
        tests: []
      }
    ],
    quadrants: [],
    tests: []
  },
  {
    id: "2024-Ananya",
    name: "Ananya K",
    registrationNo: "2341",
    course: "PGDM",
    batch: "2024",
    section: "C",
    houseName: "Bravehearts",
    gender: "Female",
    currentTerm: "Term1",
    totalScore: 65,
    grade: "B",
    overallStatus: "Progress",
    terms: [
      {
        termId: "Term1",
        termName: "Term 1 / Level 0",
        totalScore: 65,
        grade: "B",
        overallStatus: "Progress",
        quadrants: [],
        tests: []
      }
    ],
    quadrants: [],
    tests: []
  },
  {
    id: "2024-Vikram",
    name: "Vikram M",
    registrationNo: "2342",
    course: "PGDM",
    batch: "2024",
    section: "D",
    houseName: "Daredevils",
    gender: "Male",
    currentTerm: "Term1",
    totalScore: 45,
    grade: "C",
    overallStatus: "Deteriorate",
    terms: [
      {
        termId: "Term1",
        termName: "Term 1 / Level 0",
        totalScore: 45,
        grade: "C",
        overallStatus: "Deteriorate",
        quadrants: [],
        tests: []
      }
    ],
    quadrants: [],
    tests: []
  },
  {
    id: "2024-Sanjay",
    name: "Sanjay L",
    registrationNo: "2343",
    course: "PGDM",
    batch: "2024",
    section: "A",
    houseName: "Coronation",
    gender: "Male",
    currentTerm: "Term1",
    totalScore: 30,
    grade: "E",
    overallStatus: "Attendance Shortage",
    terms: [
      {
        termId: "Term1",
        termName: "Term 1 / Level 0",
        totalScore: 30,
        grade: "E",
        overallStatus: "Attendance Shortage",
        quadrants: [],
        tests: []
      }
    ],
    quadrants: [],
    tests: []
  }
];

// Mock time series data for graphs
export const timeSeriesData = {
  persona: [
    { term: 'Term 1', score: 45 },
    { term: 'Term 2', score: 42 },
    { term: 'Term 3', score: 44 },
    { term: 'Term 4', score: 46 },
    { term: 'Term 5', score: 48 }
  ],
  wellness: [
    { term: 'Term 1', score: 28 },
    { term: 'Term 2', score: 26 },
    { term: 'Term 3', score: 27 },
    { term: 'Term 4', score: 28 },
    { term: 'Term 5', score: 29 }
  ],
  behavior: [
    { term: 'Term 1', score: 9 },
    { term: 'Term 2', score: 8 },
    { term: 'Term 3', score: 9 },
    { term: 'Term 4', score: 9 },
    { term: 'Term 5', score: 10 }
  ],
  discipline: [
    { term: 'Term 1', score: 8 },
    { term: 'Term 2', score: 9 },
    { term: 'Term 3', score: 9 },
    { term: 'Term 4', score: 10 },
    { term: 'Term 5', score: 10 }
  ],
  overall: [
    { term: 'Term 1', score: 90 },
    { term: 'Term 2', score: 85 },
    { term: 'Term 3', score: 89 },
    { term: 'Term 4', score: 93 },
    { term: 'Term 5', score: 97 }
  ]
};

// Term comparison data for visualization
export const termComparisonData = [
  {
    termId: "Term1",
    termName: "Term 1 / Level 0",
    persona: 45,
    wellness: 28,
    behavior: 9,
    discipline: 8,
    overall: 90,
    grade: "A+"
  },
  {
    termId: "Term2",
    termName: "Term 2 / Level 1",
    persona: 42,
    wellness: 26,
    behavior: 8,
    discipline: 9,
    overall: 85,
    grade: "A+"
  },
  {
    termId: "Term3",
    termName: "Term 3 / Level 2",
    persona: 44,
    wellness: 27,
    behavior: 9,
    discipline: 9,
    overall: 89,
    grade: "A+"
  },
  {
    termId: "Term4",
    termName: "Term 4 / Level 3",
    persona: 46,
    wellness: 28,
    behavior: 9,
    discipline: 10,
    overall: 93,
    grade: "A+"
  },
  {
    termId: "Term5",
    termName: "Term 5 / Level 3",
    persona: 48,
    wellness: 29,
    behavior: 10,
    discipline: 10,
    overall: 97,
    grade: "A+"
  }
];

// Attendance data for tracking
export const attendanceData = {
  overall: 90,
  wellness: 85,
  eligibility: "Eligible",
  history: [
    { term: "Term 1", overall: 90, wellness: 85 },
    { term: "Term 2", overall: 88, wellness: 82 },
    { term: "Term 3", overall: 92, wellness: 88 },
    { term: "Term 4", overall: 94, wellness: 90 },
    { term: "Term 5", overall: 95, wellness: 92 }
  ]
};

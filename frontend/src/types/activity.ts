// Activity Types
export type ActivityType =
  | 'MATCH_PAIRS'
  | 'WORD_SEARCH'
  | 'CROSSWORD'
  | 'FILL_BLANKS'
  | 'DRAG_DROP'
  | 'MEMORY_GAME'
  | 'QUIZ_GAME'
  | 'SEQUENCE_ORDER'
  | 'TRUE_FALSE'
  | 'PICTURE_REVEAL'
  | 'CHESS'
  | 'HANGMAN'
  | 'SUDOKU'
  | 'ABACUS';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Activity {
  id: number;
  group_id: number;
  title: string;
  description?: string;
  instructions?: string;
  cover_image?: string;
  activity_type: ActivityType;
  difficulty: Difficulty;
  estimated_time?: number;
  points: number;
  is_published: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  group?: ActivityGroup;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  items?: ActivityItem[];
  enrollments?: ActivityEnrollment[];
  attempts?: ActivityAttempt[];
  _count?: {
    items: number;
    enrollments: number;
    attempts: number;
  };
}

export interface ActivityGroupTeacherJunction {
  id: number;
  activity_group_id: number;
  teacher_id: number;
  assigned_at: string;
  teacher: {
    id: number;
    user_id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export interface ActivityGroup {
  id: number;
  name: string;
  description?: string;
  cover_image?: string;
  is_active: boolean;
  price: number | null;
  currency_id: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  currency: { id: number; name: string; code: string; symbol: string } | null;
  teacher_junctions?: ActivityGroupTeacherJunction[];
  activities?: Activity[];
  _count?: {
    activities: number;
  };
}

export interface ActivityItem {
  id: number;
  activity_id: number;
  content: any; // JSON content specific to activity type
  order: number;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityEnrollment {
  id: number;
  activity_id: number;
  student_id: number;
  enrolled_at: string;
  activity?: Activity;
  student?: any;
}

export interface ActivityAttempt {
  id: number;
  activity_id: number;
  student_id: number;
  started_at: string;
  completed_at?: string;
  score: number;
  max_score: number;
  time_taken?: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  activity?: Activity;
  student?: {
    id: number;
    user_id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  responses?: ActivityResponse[];
}

export interface ActivityResponse {
  id: number;
  attempt_id: number;
  item_id: number;
  response: any; // JSON response
  is_correct: boolean;
  points: number;
  time_taken?: number;
  created_at: string;
  item?: ActivityItem;
}

// Form Types for Creating Activities
export interface CreateActivityGroupInput {
  name: string;
  description?: string;
  cover_image?: string;
  price?: number | null;
  currency_id?: number | null;
}

export interface CreateActivityInput {
  group_id: number;
  title: string;
  description?: string;
  instructions?: string;
  cover_image?: string;
  activity_type: ActivityType;
  difficulty: Difficulty;
  estimated_time?: number;
  points?: number;
  items: CreateActivityItemInput[];
}

export interface CreateActivityItemInput {
  content: any;
  points?: number;
}

// Activity Type Specific Content Interfaces

// Match Pairs
export interface MatchPairsContent {
  pairs: {
    left: string;
    right: string;
    imageLeft?: string;
    imageRight?: string;
  }[];
}

// Word Search
export interface WordSearchContent {
  words: string[];
  gridSize: number;
  grid?: string[][];
}

// Crossword
export interface CrosswordContent {
  clues: {
    number: number;
    direction: 'across' | 'down';
    clue: string;
    answer: string;
    row: number;
    col: number;
  }[];
}

// Fill Blanks
export interface FillBlanksContent {
  text: string;
  blanks: {
    position: number;
    answer: string;
    options?: string[];
  }[];
}

// Drag and Drop
export interface DragDropContent {
  zones: {
    id: string;
    label: string;
    correctItems: string[];
  }[];
  items: {
    id: string;
    content: string;
    image?: string;
  }[];
}

// Memory Game
export interface MemoryGameContent {
  pairs: {
    id: string;
    content: string;
    image?: string;
  }[];
}

// Quiz Game
export interface QuizGameContent {
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit?: number;
}

// Sequence Order
export interface SequenceOrderContent {
  items: {
    id: string;
    content: string;
    image?: string;
    correctOrder: number;
  }[];
}

// True/False
export interface TrueFalseContent {
  statement: string;
  correctAnswer: boolean;
}

// Abacus
export interface AbacusContent {
  prompt: string;
  answer: number;
  hint?: string;
}

// Picture Reveal
export interface PictureRevealContent {
  image: string;
  sections: number;
  questions: {
    question: string;
    answer: string;
  }[];
}

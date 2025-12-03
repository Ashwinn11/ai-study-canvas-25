import type {
  NavigationProp,
  NavigatorScreenParams,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Exam, ExamReviewStats, QuizQuestion, Flashcard } from "@/types";

// Bottom tab navigator
export type TabParamList = {
  Home: undefined;
  Library: { initialFilter?: "seeds" | "exams" } | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

// Profile stack inside the Profile tab
export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
};

// Review session classic stack
export type ReviewItem = {
  id: string;
  type: "quiz" | "flashcard";
  seed_id: string;
  seed_title: string;
  content: QuizQuestion | Flashcard;
  next_due_date?: string;
  interval?: number;
  repetitions?: number;
  easiness_factor?: number;
};

export type ReviewSessionStackParamList = {
  ReviewSession: {
    exam: Exam;
    stats: ExamReviewStats;
    examId: string;
    examName: string;
    reviewItems: ReviewItem[];
    totalQuizzes: number;
    totalFlashcards: number;
  };
};

// Root (native-stack) navigator
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Flashcard: { seedId: string; seedTitle: string };
  Quiz: {
    seedId?: string;
    seedTitle?: string;
    reviewMode?: boolean;
    reviewItems?: QuizQuestion[];
  };
  ExamDetail: { examId: string };
  MaterialDetail: { seedId: string };
  ReviewSessionNavigator:
    | NavigatorScreenParams<ReviewSessionStackParamList>
    | undefined;
  CreateExam: undefined;
  Subscription: undefined;
  HelpSupport: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  AnalyticsSettings: undefined;
};

// Unified navigation prop used by most screens to access root or tab routes
export type AppNavigationProp = NavigationProp<
  RootStackParamList & TabParamList
>;

export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

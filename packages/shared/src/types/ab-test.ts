// A/B testing types for tRPC compatibility

export interface ABTest {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date | null;
  endDate: Date | null;
  trafficAllocation: number; // Percentage of traffic to include in test
  variants: any; // JSON object containing variant definitions
  metrics: any; // JSON object containing metric definitions
  createdAt: Date;
  updatedAt: Date;
}

export interface ABTestAssignment {
  id: string;
  testId: string;
  userId: string | null;
  sessionId: string | null;
  variant: string;
  assignedAt: Date;
}

export interface ABTestConversion {
  id: string;
  testId: string;
  userId: string | null;
  sessionId: string | null;
  variant: string;
  metric: string;
  value: number | null;
  createdAt: Date;
}

// Input types
export interface CreateABTestInput {
  name: string;
  description?: string;
  trafficAllocation?: number;
  variants: ABTestVariant[];
  metrics: ABTestMetric[];
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateABTestInput {
  name?: string;
  description?: string;
  status?: 'draft' | 'running' | 'paused' | 'completed';
  trafficAllocation?: number;
  variants?: ABTestVariant[];
  metrics?: ABTestMetric[];
  startDate?: Date;
  endDate?: Date;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description?: string;
  allocation: number; // Percentage of test traffic for this variant
  config: any; // JSON object containing variant configuration
}

export interface ABTestMetric {
  id: string;
  name: string;
  description?: string;
  type: 'conversion' | 'revenue' | 'engagement' | 'custom';
  goal: 'increase' | 'decrease';
  primaryMetric: boolean;
}

// Response types
export interface ABTestResults {
  test: ABTest;
  variants: ABTestVariantResult[];
  summary: ABTestSummary;
  significance: ABTestSignificance;
  recommendations: string[];
}

export interface ABTestVariantResult {
  variant: string;
  name: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  averageOrderValue: number;
  metrics: Record<string, ABTestMetricResult>;
}

export interface ABTestMetricResult {
  metric: string;
  value: number;
  count: number;
  average: number;
  improvement: number; // Percentage improvement over control
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface ABTestSummary {
  totalParticipants: number;
  totalConversions: number;
  totalRevenue: number;
  testDuration: number; // Days
  status: string;
  winner: string | null;
  confidence: number;
}

export interface ABTestSignificance {
  isSignificant: boolean;
  confidence: number;
  pValue: number;
  requiredSampleSize: number;
  currentSampleSize: number;
  daysToSignificance: number | null;
}

// Assignment and conversion tracking
export interface AssignmentRequest {
  testId: string;
  userId?: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface AssignmentResponse {
  variant: string;
  config: any;
  assigned: boolean;
}

export interface ConversionRequest {
  testId: string;
  userId?: string;
  sessionId?: string;
  metric: string;
  value?: number;
}

// Analytics and reporting
export interface ABTestAnalytics {
  activeTests: number;
  completedTests: number;
  totalParticipants: number;
  totalConversions: number;
  averageTestDuration: number;
  successfulTests: number; // Tests with significant results
  testsByStatus: Record<string, number>;
  recentTests: ABTest[];
  topPerformingVariants: Array<{
    testId: string;
    testName: string;
    variant: string;
    improvement: number;
    confidence: number;
  }>;
}

export interface ABTestTrend {
  date: Date;
  activeTests: number;
  participants: number;
  conversions: number;
  revenue: number;
}

// Configuration types
export interface ABTestConfiguration {
  minSampleSize: number;
  maxTestDuration: number; // Days
  confidenceLevel: number; // 0.95 for 95% confidence
  minimumDetectableEffect: number; // Minimum effect size to detect
  powerLevel: number; // Statistical power (typically 0.8)
}

export interface TrafficAllocationRule {
  condition: string;
  allocation: number;
  priority: number;
}
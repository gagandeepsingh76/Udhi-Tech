export interface ScienceConcept {
  id: number;
  name: string;
  subject: 'Maths' | 'Physics' | 'Biology' | 'Chemistry';
  promptText: string;
}

export interface CheckDetail {
  passed: boolean;
  name: string;
  description: string;
  details?: string;
}

export interface ValidationReport {
  allPassed: boolean;
  checks: {
    validSvg: CheckDetail;
    withinViewBox: CheckDetail;
    titleAndLabels: CheckDetail;
    hasAnimation: CheckDetail;
    structureAndSafety: CheckDetail; // 5th custom check
  };
  summary: string[];
  failureReason?: string;
}

export interface DiagramResult {
  id: number;
  conceptName: string;
  subject: string;
  promptText: string;
  svg: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  retries: number;
  validation: ValidationReport;
  timestamp: string;
}

export interface ReviewState {
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  updatedAt: string;
}

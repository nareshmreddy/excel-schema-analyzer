// Data Types
export const DataType = {
  STRING: 'String',
  NUMBER: 'Number',
  BOOLEAN: 'Boolean',
  DATE: 'Date',
  CATEGORY: 'Category',
  UNKNOWN: 'Unknown'
};

// Semantic Roles
export const SemanticRole = {
  DIMENSION: 'Dimension',
  METRIC: 'Metric',
  ENTITY: 'Entity',
  TIMESTAMP: 'Timestamp',
  HIERARCHY: 'Hierarchy',
  IGNORED: 'Ignored'
};

// Analysis Phases
export const AnalysisPhase = {
  UPLOAD: 'upload',
  SCANNING: 'scanning',
  ANALYZING: 'analyzing',
  REVIEW: 'review',
  EXPORT: 'export'
};

// Type Guards
export function isValidDataType(type) {
  return Object.values(DataType).includes(type);
}

export function isValidSemanticRole(role) {
  return Object.values(SemanticRole).includes(role);
}

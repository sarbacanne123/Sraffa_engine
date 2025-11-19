export interface Commodity {
  id: number;
  name: string;
  totalOutput: number; // X_j
  laborInput: number;  // L_j
}

// The Input-Output Matrix
// rows = inputs, columns = outputs
// value at [i][j] is the amount of commodity i used to produce commodity j
export type InputMatrix = number[][];

export interface SystemState {
  commodities: Commodity[];
  matrix: InputMatrix; // Physical quantities matrix
  profitRate: number; // r (0 to 1)
}

export interface PriceVector {
  [id: number]: number;
}

export interface ComputedMetrics {
  prices: number[]; // Relative prices
  wage: number;     // Derived wage rate (assuming numeraire)
  isValid: boolean;
  maxProfitRate: number | null;
}

export interface GeminiAnalysis {
  text: string;
  loading: boolean;
}
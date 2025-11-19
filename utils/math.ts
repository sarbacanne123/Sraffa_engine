
/**
 * Solves linear system Ax = b using Gaussian elimination with partial pivoting.
 */
export const solveLinearSystem = (A: number[][], b: number[]): number[] | null => {
  const n = A.length;
  // Deep copy to avoid mutating inputs
  const M = A.map((row) => [...row]);
  const x = new Array(n).fill(0);
  const aug = b.map((val, i) => [...M[i], val]); // Augmented matrix

  for (let i = 0; i < n; i++) {
    // Pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

    // Check singularity
    if (Math.abs(aug[i][i]) < 1e-10) return null;

    // Eliminate
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k][i] / aug[i][i];
      for (let j = i; j <= n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }

  // Back substitution
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += aug[i][j] * x[j];
    }
    x[i] = (aug[i][n] - sum) / aug[i][i];
  }

  return x;
};

/**
 * Calculates the dominant eigenvalue of a matrix using Power Iteration.
 */
const getDominantEigenvalue = (A: number[][]): number => {
  const n = A.length;
  if (n === 0) return 0;

  // Start with a normalized vector
  let v = new Array(n).fill(1.0 / Math.sqrt(n));
  let lambda = 0;

  // Iterate
  for (let iter = 0; iter < 1000; iter++) {
    const w = new Array(n).fill(0);
    
    // w = A * v
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        w[i] += A[i][j] * v[j];
      }
    }

    // Normalize
    let norm = 0;
    for (let i = 0; i < n; i++) norm += w[i] ** 2;
    norm = Math.sqrt(norm);

    if (norm < 1e-12) return 0; // Zero matrix or similar issue

    for (let i = 0; i < n; i++) v[i] = w[i] / norm;
  }

  // Rayleigh quotient calculation: (v^T * A * v) / (v^T * v)
  // Since v is normalized, denominator is 1.
  const Av = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      Av[i] += A[i][j] * v[j];
    }
  }

  lambda = 0;
  for (let i = 0; i < n; i++) lambda += v[i] * Av[i];

  return lambda;
};

/**
 * Calculates the Maximum Rate of Profit (R).
 * R = (1 / lambda_max) - 1, where lambda_max is the Perron-Frobenius root of A.
 */
export const calculateMaxProfitRate = (
  physicalMatrix: number[][],
  totalOutputs: number[]
): number => {
  const n = totalOutputs.length;
  
  // Construct Coefficient Matrix A
  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const Q_ij = physicalMatrix[i][j];
      const X_j = totalOutputs[j];
      row.push(X_j === 0 ? 0 : Q_ij / X_j);
    }
    A.push(row);
  }

  const lambda = getDominantEigenvalue(A);

  if (lambda <= 1e-9) return 100.0; // If lambda is 0, inputs are 0, R is infinite (cap at 10000%)
  
  return (1.0 / lambda) - 1.0;
};

/**
 * Calculates Sraffian Prices.
 * Equation: P = (1+r)AP + wL
 */
export const calculateSraffianPrices = (
  physicalMatrix: number[][],
  laborVector: number[],
  totalOutputs: number[],
  r: number,
  w: number = 1.0
): { prices: number[], isValid: boolean } => {
  const n = totalOutputs.length;
  
  // 1. Calculate Coefficient Matrix A where A_ij = Q_ij / X_j
  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const Q_ij = physicalMatrix[i][j];
      const X_j = totalOutputs[j];
      row.push(X_j === 0 ? 0 : Q_ij / X_j);
    }
    A.push(row);
  }

  // 2. Calculate Unit Labor l_j = (L_j / X_j) * w
  // w is the nominal wage rate
  const l: number[] = [];
  for (let j = 0; j < n; j++) {
    const L_j = laborVector[j];
    const X_j = totalOutputs[j];
    l.push(X_j === 0 ? 0 : (L_j / X_j) * w);
  }

  // 3. Form the system [I - (1+r)A]P = l
  // Since we define A[i][j] as input of i into j, the price equation for commodity j is:
  // p_j = (1+r) * sum(p_i * A[i][j]) + l_j
  
  const SystemMatrix: number[][] = [];
  const Multiplier = 1 + r;
  
  for (let row = 0; row < n; row++) {
      const matrixRow: number[] = [];
      for (let col = 0; col < n; col++) {
          // We are building equation for p_row (where 'row' is the commodity index)
          // p_row - (1+r) * sum(A[col][row] * p_col) = l_row
          
          const a_input_into_row = A[col][row]; 
          
          if (row === col) {
              matrixRow.push(1 - Multiplier * a_input_into_row);
          } else {
              matrixRow.push(-Multiplier * a_input_into_row);
          }
      }
      SystemMatrix.push(matrixRow);
  }

  const prices = solveLinearSystem(SystemMatrix, l);
  
  if (!prices) return { prices: [], isValid: false };
  
  // Economic validity check: all prices should be positive
  // Relaxed check: allow negative prices if mathematically consistent, 
  // just flag validity based on positivity.
  const isValid = prices.every(p => p > -1e-6);

  return { prices, isValid };
};

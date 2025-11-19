import React from 'react';
import { Commodity, InputMatrix } from '../types';

interface MatrixInputProps {
  commodities: Commodity[];
  matrix: InputMatrix;
  onUpdateMatrix: (newMatrix: InputMatrix) => void;
  onUpdateCommodity: (index: number, field: keyof Commodity, value: any) => void;
  onAddCommodity: () => void;
  onRemoveCommodity: (index: number) => void;
}

const MatrixInput: React.FC<MatrixInputProps> = ({
  commodities,
  matrix,
  onUpdateMatrix,
  onUpdateCommodity,
  onAddCommodity,
  onRemoveCommodity
}) => {

  const handleMatrixChange = (row: number, col: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newMatrix = matrix.map(r => [...r]);
    newMatrix[row][col] = num;
    onUpdateMatrix(newMatrix);
  };

  return (
    <div className="bg-sraffa-800 p-6 rounded-xl shadow-lg border border-sraffa-600 overflow-x-auto">
      <h3 className="text-xl font-light text-sraffa-100 mb-4 font-serif italic">Technological Structure</h3>
      
      <div className="min-w-[600px]">
        {/* Header Row */}
        <div className="flex mb-2">
          <div className="w-32 shrink-0 flex items-end justify-end pb-2 pr-2 text-sraffa-400 text-sm">Inputs ↓ \ Outputs →</div>
          {commodities.map((c, i) => (
            <div key={c.id} className="w-24 shrink-0 flex flex-col items-center gap-1 group relative">
              <input
                value={c.name}
                onChange={(e) => onUpdateCommodity(i, 'name', e.target.value)}
                className="w-full bg-transparent text-center text-sraffa-200 border-b border-sraffa-600 focus:border-blue-400 outline-none text-sm font-bold transition-colors"
              />
               <button 
                onClick={() => onRemoveCommodity(i)}
                className="absolute -top-5 right-0 text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-300"
                disabled={commodities.length <= 1}
                title="Remove Industry"
               >
                 remove
               </button>
            </div>
          ))}
           <div className="w-24 shrink-0 flex flex-col items-center justify-end pb-2 border-l border-sraffa-700 ml-2 pl-2">
            <span className="text-xs text-green-400 font-bold">Total Output</span>
           </div>
           <div className="w-24 shrink-0 flex flex-col items-center justify-end pb-2 border-l border-sraffa-700 pl-2">
            <span className="text-xs text-yellow-400 font-bold">Labor Input</span>
           </div>
        </div>

        {/* Matrix Rows */}
        {commodities.map((rowComm, rowIdx) => (
          <div key={rowComm.id} className="flex mb-2 items-center group">
             {/* Row Label */}
            <div className="w-32 shrink-0 text-right pr-4 text-sraffa-300 font-medium text-sm truncate group-hover:text-white transition-colors">
              {rowComm.name} Used
            </div>

            {/* Matrix Cells (Columns) */}
            {commodities.map((colComm, colIdx) => (
              <div key={`${rowIdx}-${colIdx}`} className="w-24 shrink-0 px-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={matrix[rowIdx][colIdx]}
                  onChange={(e) => handleMatrixChange(rowIdx, colIdx, e.target.value)}
                  className="w-full bg-sraffa-900 text-white p-2 rounded border border-sraffa-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-right text-sm transition-all"
                />
              </div>
            ))}
            
            {/* Total Output Column */}
             <div className="w-24 shrink-0 px-1 border-l border-sraffa-700 ml-2 pl-2">
                  <input
                    type="number"
                    min="0.001"
                    step="1"
                    value={commodities[rowIdx].totalOutput}
                    onChange={(e) => onUpdateCommodity(rowIdx, 'totalOutput', parseFloat(e.target.value))}
                    className="w-full bg-sraffa-900/50 text-green-400 font-bold p-2 rounded border border-sraffa-700 focus:border-green-500 outline-none text-right text-sm"
                  />
             </div>

             {/* Labor Input Column - Note: Visual alignment trick, labor is actually a vector L_j (columns), but we display it here for compactness? 
                 Wait. L_j is labor used BY industry j. 
                 In this grid, columns are industries. 
                 So Labor should be a ROW at the bottom, or we need to realize this visual structure:
                 Rows = Inputs (Commodity i).
                 Cols = Outputs (Industry j).
                 Labor is an Input. So Labor should be a ROW.
                 
                 The previous layout had Total Output and Labor as separate blocks.
                 Let's stick to the logic: 
                 Columns represent industries.
                 So we should have a "Labor" row.
                 
                 However, the props passed commodities[rowIdx].totalOutput.
                 Commodity i is produced by Industry i.
                 So Total Output X_i corresponds to Row i (if we view it as supply) OR Col i (if we view it as production process).
                 Standard IO: Column j sums to Total Outlays (if prices known).
                 X_j is the total output of column j.
                 
                 My previous code in App.tsx renders MatrixInput.
                 Let's adjust the visual layout to be strictly standard IO table.
                 Inputs (Rows) -> Industries (Cols).
                 
                 The Total Output column I added above corresponds to the Total Output of the Commodity in the ROW.
                 Since we assume single-product industries, Row i corresponds to Industry i.
                 So X_i is correct there.
                 
                 But Labor... Labor is an input into Industry j (Column).
                 So Labor must be a Row at the bottom.
            */}
          </div>
        ))}

        <div className="h-px bg-sraffa-600 my-4 w-full"></div>
        
         {/* Labor Input Row */}
         <div className="flex mb-2 items-center">
             <div className="w-32 shrink-0 text-right pr-4 text-yellow-400 font-bold text-sm">
               Labor (L)
             </div>
             {commodities.map((c, i) => (
               <div key={c.id} className="w-24 shrink-0 px-1">
                  <input
                    type="number"
                    min="0"
                    value={c.laborInput}
                    onChange={(e) => onUpdateCommodity(i, 'laborInput', parseFloat(e.target.value))}
                    className="w-full bg-sraffa-900/50 text-yellow-400 font-bold p-2 rounded border border-sraffa-700 focus:border-yellow-500 outline-none text-right text-sm"
                  />
               </div>
             ))}
             {/* Spacer for the Total Output column alignment */}
             <div className="w-24 ml-2 pl-2"></div> 
        </div>

        <div className="mt-6">
          <button 
            onClick={onAddCommodity}
            className="px-4 py-2 bg-sraffa-700 hover:bg-sraffa-600 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span>+</span> Add Commodity
          </button>
        </div>

      </div>
    </div>
  );
};

export default MatrixInput;
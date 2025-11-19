
import React, { useState, useEffect, useMemo } from 'react';
import MatrixInput from './components/MatrixInput';
import { Commodity, InputMatrix, ComputedMetrics } from './types';
import { calculateSraffianPrices, calculateMaxProfitRate } from './utils/math';
import { analyzeEconomy } from './services/gemini';

// Initial State: A simple 2-sector surplus system
// Based on a variation of Sraffa's Example
const INITIAL_COMMODITIES: Commodity[] = [
  { id: 1, name: 'Wheat', totalOutput: 575, laborInput: 18 },
  { id: 2, name: 'Iron', totalOutput: 20, laborInput: 12 },
];

const INITIAL_MATRIX: InputMatrix = [
  [280, 120], // Wheat inputs into [Wheat Ind, Iron Ind]
  [12, 8],    // Iron inputs into [Wheat Ind, Iron Ind]
];

const App: React.FC = () => {
  const [commodities, setCommodities] = useState<Commodity[]>(INITIAL_COMMODITIES);
  const [matrix, setMatrix] = useState<InputMatrix>(INITIAL_MATRIX);
  const [profitRate, setProfitRate] = useState<number>(0.15); // 15%
  const [wage, setWage] = useState<number>(1.0);
  
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const metrics: ComputedMetrics = useMemo(() => {
    const laborVector = commodities.map(c => c.laborInput);
    const totalOutputs = commodities.map(c => c.totalOutput);
    
    const maxProfitRate = calculateMaxProfitRate(matrix, totalOutputs);
    const result = calculateSraffianPrices(matrix, laborVector, totalOutputs, profitRate, wage);
    
    return {
      prices: result.prices,
      isValid: result.isValid,
      wage: wage, 
      maxProfitRate: maxProfitRate
    };
  }, [commodities, matrix, profitRate, wage]);

  // Calculate National Accounts (Aggregates)
  const aggregates = useMemo(() => {
    if (!metrics.prices.length) return null;

    let totalCapital = 0;
    let totalWages = 0;
    let totalGrossOutput = 0;

    // Calculate Total Wages and Total Gross Output
    commodities.forEach((c, idx) => {
        const p = metrics.prices[idx] || 0;
        totalGrossOutput += p * c.totalOutput;
        totalWages += metrics.wage * c.laborInput;
    });

    // Calculate Total Capital (Value of Means of Production)
    // Matrix: rows = inputs, cols = outputs
    // Loop through columns (industries) to sum up the value of inputs used
    for (let j = 0; j < commodities.length; j++) {
        let industryCapital = 0;
        for (let i = 0; i < commodities.length; i++) {
            const inputAmount = matrix[i][j];
            const p = metrics.prices[i] || 0;
            industryCapital += p * inputAmount;
        }
        totalCapital += industryCapital;
    }

    const totalProfits = totalCapital * profitRate;
    
    // Net Product (National Income) = Wages + Profits
    // This is equivalent to Gross Output - Replacement Capital
    const netProduct = totalWages + totalProfits; 
    
    // Prevent division by zero for shares
    const denom = netProduct === 0 ? 1 : netProduct;

    return {
        totalWages,
        totalProfits,
        netProduct,
        totalCapital,
        wageShare: (totalWages / denom) * 100,
        profitShare: (totalProfits / denom) * 100
    };
  }, [metrics, commodities, matrix, profitRate]);

  const handleMatrixUpdate = (newMatrix: InputMatrix) => {
    setMatrix(newMatrix);
  };

  const handleCommodityUpdate = (index: number, field: keyof Commodity, value: any) => {
    const newComms = [...commodities];
    newComms[index] = { ...newComms[index], [field]: value };
    setCommodities(newComms);
  };

  const handleAddCommodity = () => {
    const newId = (Math.max(...commodities.map(c => c.id)) || 0) + 1;
    const newComm: Commodity = { 
      id: newId, 
      name: `Comm ${newId}`, 
      totalOutput: 100, 
      laborInput: 10 
    };
    
    setCommodities([...commodities, newComm]);
    
    const intermediateMatrix = matrix.map(row => [...row, 0]);
    const newRow = new Array(commodities.length + 1).fill(0);
    setMatrix([...intermediateMatrix, newRow]);
  };

  const handleRemoveCommodity = (index: number) => {
    if (commodities.length <= 1) return;
    
    const newComms = commodities.filter((_, i) => i !== index);
    
    const newMatrix = matrix
      .filter((_, r) => r !== index) 
      .map(row => row.filter((_, c) => c !== index)); 
      
    setCommodities(newComms);
    setMatrix(newMatrix);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const text = await analyzeEconomy(commodities, matrix, profitRate, metrics.prices, metrics.isValid);
    setAnalysis(text);
    setIsAnalyzing(false);
  };

  const getCostBreakdown = (idx: number) => {
    if (metrics.prices.length === 0) return null;
    const price = metrics.prices[idx];
    
    let constantCapitalValue = 0;
    commodities.forEach((inputComm, inputIdx) => {
      const inputAmount = matrix[inputIdx][idx];
      const output = commodities[idx].totalOutput;
      const a_ij = output > 0 ? inputAmount / output : 0;
      constantCapitalValue += (metrics.prices[inputIdx] || 0) * a_ij;
    });

    const profit = constantCapitalValue * profitRate;
    const wageCost = (commodities[idx].laborInput / commodities[idx].totalOutput) * metrics.wage;
    
    return { constantCapitalValue, profit, wageCost, price };
  };

  // Determine slider Max
  const maxR = metrics.maxProfitRate || 1;
  const sliderMax = Math.max(1.0, maxR * 1.2); // Allow going 20% past R
  const rPercent = metrics.maxProfitRate ? (metrics.maxProfitRate / sliderMax) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#1a202c] text-gray-100 p-4 md:p-8 font-sans selection:bg-sraffa-500 selection:text-white">
      <header className="max-w-7xl mx-auto mb-10 border-b border-sraffa-700 pb-4 flex flex-col md:flex-row justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif font-bold text-sraffa-100 tracking-tight">Sraffa Engine</h1>
          <p className="text-sraffa-400 mt-2 text-lg italic">"Production of Commodities by Means of Commodities"</p>
        </div>
        <div className="text-right mt-4 md:mt-0">
           <div className="text-xs text-sraffa-500 uppercase tracking-widest font-bold">System Status</div>
           <div className={`text-sm font-bold ${metrics.isValid ? 'text-green-400' : 'text-yellow-400'}`}>
             {metrics.isValid ? 'PRICES POSITIVE' : `NEGATIVE PRICES (r > R)`}
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="space-y-6">
          <section>
            <MatrixInput 
              commodities={commodities}
              matrix={matrix}
              onUpdateMatrix={handleMatrixUpdate}
              onUpdateCommodity={handleCommodityUpdate}
              onAddCommodity={handleAddCommodity}
              onRemoveCommodity={handleRemoveCommodity}
            />
          </section>

          <section className="bg-sraffa-800 p-6 rounded-xl border border-sraffa-600">
             <h3 className="text-xl font-light text-sraffa-100 mb-4 font-serif italic">Exogenous Variables</h3>
             <div className="flex flex-col gap-6">
               
               <div className="relative pt-6 pb-2">
                 <label className="absolute top-0 left-0 text-sm font-bold text-sraffa-300">
                   Rate of Profit (r)
                 </label>
                 <div className="absolute top-0 right-0 text-sm font-mono font-bold text-blue-300">
                    {(profitRate * 100).toFixed(1)}%
                 </div>

                 {/* Slider Container */}
                 <div className="relative h-6 w-full flex items-center mt-2">
                    {/* R tick mark */}
                    {metrics.maxProfitRate !== null && (
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-red-500 z-10 pointer-events-none"
                            style={{ left: `${rPercent}%` }}
                        >
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-red-900/90 text-red-200 text-[10px] px-2 py-1 rounded whitespace-nowrap border border-red-700 shadow-lg z-30">
                                Max R: {(metrics.maxProfitRate * 100).toFixed(1)}%
                             </div>
                        </div>
                    )}
                    
                    <input 
                      type="range" 
                      min="0" 
                      max={sliderMax} 
                      step="0.001"
                      value={profitRate}
                      onChange={(e) => setProfitRate(parseFloat(e.target.value))}
                      className="w-full h-2 bg-sraffa-900 rounded-lg appearance-none cursor-pointer accent-blue-500 z-20 bg-transparent"
                      style={{ 
                          backgroundImage: `linear-gradient(to right, #384e5e 0%, #384e5e 100%)`,
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat'
                       }}
                    />
                 </div>
                 <div className="flex justify-between text-[10px] text-sraffa-500 mt-1">
                   <span>0%</span>
                   <span>{(sliderMax * 100).toFixed(0)}%</span>
                 </div>
               </div>

               <div className="bg-sraffa-900 p-3 rounded border border-sraffa-700 flex items-center justify-between">
                 <div className="text-xs text-sraffa-400">Wage Rate (w)<br/><span className="text-[10px] opacity-50">(Numeraire)</span></div>
                 <div>
                   <input 
                     type="number"
                     step="0.1"
                     min="0"
                     value={wage}
                     onChange={(e) => setWage(Math.max(0, parseFloat(e.target.value)))}
                     className="bg-transparent text-right text-xl font-mono text-yellow-400 focus:outline-none focus:border-b focus:border-yellow-500 w-24"
                   />
                 </div>
               </div>

             </div>
          </section>
        </div>

        {/* RIGHT COLUMN: ANALYSIS & VISUALIZATION */}
        <div className="space-y-6">
          
          {/* PRICES CARD */}
          <section className="bg-sraffa-800 p-6 rounded-xl border border-sraffa-600">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-light text-sraffa-100 font-serif italic">Relative Prices</h3>
               <span className="text-xs bg-sraffa-900 text-sraffa-300 px-2 py-1 rounded border border-sraffa-700">
                 Standard: Wage = {wage}
               </span>
            </div>

            {metrics.prices.length > 0 ? (
              <div className="grid gap-4">
                {commodities.map((c, i) => {
                  const breakdown = getCostBreakdown(i);
                  if (!breakdown) return null;
                  const { constantCapitalValue, profit, wageCost, price } = breakdown;
                  
                  // Handle Negative Prices (r > R)
                  if (price < 0) {
                      return (
                        <div key={c.id} className="relative opacity-75">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-bold text-red-300">{c.name}</span>
                                <span className="font-mono text-red-300">{price.toFixed(4)}</span>
                            </div>
                            <div className="h-6 w-full bg-red-900/20 rounded flex items-center justify-center border border-red-900/50 text-[10px] text-red-400 uppercase tracking-widest">
                                Negative Price
                            </div>
                        </div>
                      );
                  }

                  // Calculate percentages for bar width
                  const ccPct = Math.max(0, (constantCapitalValue / price) * 100);
                  const profitPct = Math.max(0, (profit / price) * 100);
                  const wagePct = Math.max(0, (wageCost / price) * 100);

                  return (
                    <div key={c.id} className="relative">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-sraffa-200">{c.name}</span>
                        <span className="font-mono text-blue-300">{price.toFixed(4)}</span>
                      </div>
                      
                      {/* Visualization Bar */}
                      <div className="h-6 w-full bg-sraffa-900 rounded-full overflow-hidden flex border border-sraffa-700">
                        <div style={{ width: `${ccPct}%` }} className="bg-sraffa-500 h-full relative group">
                           {ccPct > 5 && <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-xs p-1 rounded whitespace-nowrap pointer-events-none z-10">
                             Inputs: {constantCapitalValue.toFixed(3)}
                           </div>}
                        </div>
                        <div style={{ width: `${profitPct}%` }} className="bg-blue-500 h-full relative group">
                           {profitPct > 5 && <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-xs p-1 rounded whitespace-nowrap pointer-events-none z-10">
                             Profit: {profit.toFixed(3)}
                           </div>}
                        </div>
                        <div style={{ width: `${wagePct}%` }} className="bg-yellow-500 h-full relative group">
                           {wagePct > 5 && <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-xs p-1 rounded whitespace-nowrap pointer-events-none z-10">
                             Wage: {wageCost.toFixed(3)}
                           </div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex gap-4 mt-4 text-[10px] text-sraffa-400 justify-center border-t border-sraffa-700 pt-2">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-sraffa-500 rounded-full"></div> Means of Prod.</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Profit</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> Wages</div>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center bg-red-900/20 border border-red-900/50 rounded text-red-300">
                Singular matrix or calculation error.
              </div>
            )}
          </section>

           {/* AGGREGATE DISTRIBUTION CARD */}
           {aggregates && (
            <section className="bg-sraffa-800 p-6 rounded-xl border border-sraffa-600">
                <h3 className="text-xl font-light text-sraffa-100 mb-4 font-serif italic">Aggregate Distribution</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-sraffa-900/30 rounded border border-sraffa-700/50">
                        <div className="text-xs text-sraffa-400 uppercase tracking-widest mb-1">Total Wages</div>
                        <div className="text-2xl font-mono text-yellow-400 font-bold truncate" title={aggregates.totalWages.toFixed(4)}>
                            {aggregates.totalWages.toFixed(2)}
                        </div>
                        <div className="text-xs text-sraffa-500 mt-1 font-medium">
                            {aggregates.wageShare.toFixed(1)}% of Net Product
                        </div>
                    </div>
                    <div className="p-4 bg-sraffa-900/30 rounded border border-sraffa-700/50">
                        <div className="text-xs text-sraffa-400 uppercase tracking-widest mb-1">Total Profits</div>
                        <div className="text-2xl font-mono text-blue-400 font-bold truncate" title={aggregates.totalProfits.toFixed(4)}>
                            {aggregates.totalProfits.toFixed(2)}
                        </div>
                        <div className="text-xs text-sraffa-500 mt-1 font-medium">
                            {aggregates.profitShare.toFixed(1)}% of Net Product
                        </div>
                    </div>
                </div>

                {/* Distribution Bar */}
                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between text-xs text-sraffa-400">
                        <span>Wage Share</span>
                        <span>Profit Share</span>
                    </div>
                    <div className="h-3 w-full bg-sraffa-900 rounded-full overflow-hidden flex border border-sraffa-700/50">
                        {/* We clamp percentages to handle negative price anomalies gracefully in the UI */}
                        <div 
                          style={{ width: `${Math.max(0, Math.min(100, aggregates.wageShare))}%` }} 
                          className="bg-yellow-500/80 h-full transition-all duration-300"
                        ></div>
                        <div 
                          style={{ width: `${Math.max(0, Math.min(100, aggregates.profitShare))}%` }} 
                          className="bg-blue-500/80 h-full transition-all duration-300"
                        ></div>
                    </div>
                    <div className="mt-2 flex justify-end">
                        <div className="text-[10px] text-sraffa-500 font-mono">
                            Net National Product: {aggregates.netProduct.toFixed(2)}
                        </div>
                    </div>
                </div>
            </section>
           )}

          {/* GEMINI ANALYSIS CARD */}
          <section className="bg-gradient-to-br from-sraffa-800 to-sraffa-900 p-6 rounded-xl border border-sraffa-600 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
             </div>
             
             <h3 className="text-xl font-light text-sraffa-100 mb-4 font-serif italic flex items-center gap-2">
               <span>Economic Commentary</span>
               <span className="text-xs font-sans not-italic bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">Gemini 2.5 Flash</span>
             </h3>

             <div className="prose prose-invert prose-sm mb-6 min-h-[100px] text-sraffa-200 leading-relaxed">
               {analysis ? (
                 <p className="whitespace-pre-wrap">{analysis}</p>
               ) : (
                 <p className="text-sraffa-500 italic">Ask the engine to analyze the productivity and price relations of the current system configuration...</p>
               )}
             </div>

             <button 
               onClick={handleAnalyze}
               disabled={isAnalyzing}
               className={`w-full py-3 rounded font-bold transition-all flex items-center justify-center gap-2
                 ${isAnalyzing 
                   ? 'bg-sraffa-700 text-sraffa-400 cursor-wait' 
                   : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25'
                 }`}
             >
               {isAnalyzing ? (
                 <>
                   <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Consulting Sraffa...
                 </>
               ) : (
                 <>Generate Analysis</>
               )}
             </button>
          </section>

        </div>
      </main>
    </div>
  );
};

export default App;


// A mock service to simulate Central Bureau of Statistics (Lamas) data
// In a real app, this would fetch from an API.

export const calculateLinkedAmount = (baseAmount: number, startDateStr: string): { amount: number, increasePercent: number } => {
  if (!baseAmount || !startDateStr) return { amount: baseAmount, increasePercent: 0 };

  const start = new Date(startDateStr);
  const now = new Date();
  
  // Calculate difference in months
  const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  
  if (monthsDiff <= 0) return { amount: baseAmount, increasePercent: 0 };

  // Simulate an average annual inflation of 3% (0.25% per month)
  // This is purely for demonstration purposes since we can't access real live data here.
  const simulatedMonthlyIndex = 0.0025; // 0.25%
  
  // Compound interest formula for indexation: Base * (1 + rate)^months
  const multiplier = Math.pow(1 + simulatedMonthlyIndex, monthsDiff);
  
  const newAmount = Math.round(baseAmount * multiplier);
  const increasePercent = parseFloat(((multiplier - 1) * 100).toFixed(2));

  return {
    amount: newAmount,
    increasePercent
  };
};

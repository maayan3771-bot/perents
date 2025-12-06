// We access the SDK dynamically via CDN to avoid bundler resolution issues

declare global {
  interface Window {
    GoogleGenAI: any;
    GenAIType: any;
  }
}

// Helper to lazy load the SDK only when needed
const loadGenAISDK = async () => {
  if (window.GoogleGenAI && window.GenAIType) {
    return;
  }

  try {
    // Dynamic import allows the app to load first, then fetch the heavy AI library only when used
    // @ts-ignore
    const module = await import('https://esm.sh/@google/genai');
    window.GoogleGenAI = module.GoogleGenAI;
    window.GenAIType = module.Type;
  } catch (error) {
    console.error('Failed to load GenAI SDK:', error);
    throw new Error(
      'שגיאת טעינה: לא ניתן להתחבר לשירותי ה-AI. אנא בדוק את החיבור לרשת.'
    );
  }
};

export const analyzeReceipt = async (
  base64Image: string
): Promise<{ description: string; amount: number; date?: string }> => {
  // 1. Ensure SDK is loaded before trying to use it
  await loadGenAISDK();

  // 2. Check if loading succeeded
  if (!window.GoogleGenAI || !window.GenAIType) {
    throw new Error('AI Service unavailable.');
  }

  // Initialize on demand
  const ai = new window.GoogleGenAI({ apiKey: process.env.API_KEY });
  const Type = window.GenAIType;

  const expenseSchema = {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: 'A short description of the expense/purchase.',
      },
      amount: {
        type: Type.NUMBER,
        description: 'The total amount of the expense.',
      },
      date: {
        type: Type.STRING,
        description: 'The date of the purchase in YYYY-MM-DD format.',
      },
    },
    required: ['description', 'amount'],
  };

  try {
    const model = 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: 'Analyze this receipt image. Extract the total amount, a brief description of the items (in Hebrew if possible), and the date.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: expenseSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error('No response from Gemini');

    return JSON.parse(text);
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    throw error;
  }
};

import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedData, HistoryEntry, ImageDataSource } from '../types';

if (!process.env.API_KEY) {
  throw new Error(
    "Gemini API Key is missing. Please ensure the API_KEY environment variable is set in your deployment environment. The application cannot function without it."
  );
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    date: {
      type: Type.STRING,
      description: "The full date extracted from the image, formatted as YYYY-MM-DD. e.g., '2025-09-25'. If not found, return an empty string.",
    },
    time: {
      type: Type.STRING,
      description: "The exact time extracted from the image, e.g., '08:09'. If not found, return an empty string.",
    },
    location: {
      type: Type.STRING,
      description: "The full address or location name from the image, e.g., 'Blvd. Juan Alonso de Torres Pte. 1124, Predio Cerro Gordo, 37150 León de los Aldama, Gto., México'. If not found, return an empty string.",
    },
    latitude: {
        type: Type.NUMBER,
        description: "The geographic latitude coordinate. For Mexico, this is a positive number. Return null if not found or uncertain.",
    },
    longitude: {
        type: Type.NUMBER,
        description: "The geographic longitude coordinate. For Mexico, this is a negative number. Return null if not found or uncertain.",
    },
  },
  required: ["date", "time", "location", "latitude", "longitude"],
};

export const analyzeImageForLocation = async (
  imageData: ImageDataSource
): Promise<ExtractedData> => {
  const prompt = `
    Analyze the provided image, which shows a location history screen. 
    Your task is to extract the following information:
    1.  **Fecha (Date):** The full date shown. Format this as YYYY-MM-DD.
    2.  **Hora (Time):** The exact time associated with the location pin.
    3.  **Lugar (Location):** The complete address or place name.
    4.  **Coordinates:** The precise geographic coordinates (latitude and longitude) for the location address. The latitude for locations in Mexico should be a positive number (North), and the longitude should be a negative number (West). For example, Mexico City is around 19.4326° N, -99.1332° W. Prioritize accuracy and return null if you cannot determine the coordinates with high confidence.
    
    **CRITICAL CONTEXT:** All locations in this image are within or very near the city of **León, Guanajuato, México**. Use this information to disambiguate the address and find the most accurate coordinates.

    Return the information in a structured JSON object. The user's original request was in Spanish: 'analiza la imagen y dime si puedes extraer los siguientes datos: Fecha, Hora y lugar'.
    Strictly adhere to the provided JSON schema. If a piece of information cannot be found, return an empty string for text fields and null for numeric fields. Do not add any explanatory text outside the JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText);

    if (
      typeof parsedData.date === 'string' &&
      typeof parsedData.time === 'string' &&
      typeof parsedData.location === 'string' &&
      (typeof parsedData.latitude === 'number' || parsedData.latitude === null) &&
      (typeof parsedData.longitude === 'number' || parsedData.longitude === null)
    ) {
      return parsedData;
    } else {
      throw new Error('Invalid data structure received from API.');
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze image. The API returned an error.");
  }
};

export const getChatbotResponse = async (
  question: string,
  history: HistoryEntry[]
): Promise<string> => {
  // Prune the history data to only include relevant fields to save tokens
  const simplifiedHistory = history.map(entry => ({
    date: entry.data.date,
    time: entry.data.time,
    location: entry.data.location,
    latitude: entry.data.latitude,
    longitude: entry.data.longitude,
  }));

  const prompt = `
    You are an intelligent travel assistant. Your task is to analyze the provided travel history data and answer the user's questions.

    **RULES:**
    1.  Your answers **MUST** be based exclusively on the JSON data provided in the "Travel History" section.
    2.  Do not make up any information or use external knowledge.
    3.  If the answer cannot be found in the provided data, state that clearly. For example, "I don't have enough information in the history to answer that."
    4.  Keep your answers concise and directly related to the user's question.
    5.  The user's original language is Spanish. Respond in Spanish.

    **Travel History (JSON data):**
    ${JSON.stringify(simplifiedHistory, null, 2)}

    **User's Question:**
    "${question}"

    Provide your answer in Spanish.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for chatbot:", error);
    throw new Error("Failed to get a response from the assistant. Please try again.");
  }
};

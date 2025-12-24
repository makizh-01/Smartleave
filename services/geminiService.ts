
import { GoogleGenAI } from "@google/genai";

const generateLeaveLetter = async (data: any): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("API Key not found, using template fallback.");
    return fallbackTemplate(data);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let durationStr = `${data.fromDate} to ${data.toDate}`;
    if (data.dayType === 'Half Day') {
        durationStr = `${data.fromDate}`;
        if (data.time) durationStr += ` at ${data.time}`;
        if (data.sectionsStr) durationStr += ` (${data.sectionsStr})`;
    }

    const prompt = `
      Write a professional and polite leave application letter.
      
      Details:
      - Applicant Name: ${data.name}
      - Role: ${data.isTeachingStaff ? 'Teaching Staff' : 'Non-Teaching Staff'}
      - Department: ${data.department || 'N/A'}
      - Duration: ${durationStr}
      - Type: ${data.dayType}
      - Reason Category: ${data.purpose}
      - Work Delegated To (Acting Staff): ${data.actingStaff}
      
      Instructions:
      - Format it as a formal letter.
      - Subject line should be clear.
      - If medical leave, mention a medical certificate is attached.
      - Be concise but respectful.
      - Use generic salutations like "To The Principal" or "Respected Sir/Madam".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || fallbackTemplate(data);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return fallbackTemplate(data);
  }
};

const fallbackTemplate = (data: any) => {
  let durationStr = `${data.fromDate} to ${data.toDate}`;
  if (data.dayType === 'Half Day') {
      durationStr = `${data.fromDate}`;
      if (data.sectionsStr) durationStr += ` (${data.sectionsStr})`;
  }

  return `To The Authority,

Subject: Leave Application for ${data.purpose}

Respected Sir/Madam,

I am writing to request a ${data.dayType.toLowerCase()} leave for ${durationStr}.
The reason for this request is: ${data.purpose}.

I have arranged for ${data.actingStaff} to handle my responsibilities during my absence.
${data.purpose === 'Medical Leave' ? 'I have attached my medical certificate for your reference.' : ''}

I kindly request you to approve my leave.

Sincerely,
${data.name}
${data.department ? `Department: ${data.department}` : ''}`;
};

export { generateLeaveLetter };

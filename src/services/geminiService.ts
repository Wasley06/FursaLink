import { GoogleGenAI } from "@google/genai";
import { Job, UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getSmartJobMatches(userProfile: UserProfile, availableJobs: Job[]) {
  if (!userProfile || availableJobs.length === 0) return [];

  const prompt = `
    You are an expert AI Job Matching assistant for the Zanzibar Government (FursaLink).
    Your task is to rank and recommend the best job opportunities for a candidate.

    Candidate Profile:
    - Occupation: ${userProfile.occupation}
    - Education: ${userProfile.education}
    - Skills: ${userProfile.skills}
    - Experience: ${userProfile.experience} years
    - District: ${userProfile.district}

    Available Jobs:
    ${availableJobs.map(j => `ID: ${j.id}, Title: ${j.title}, Description: ${j.description}, Qualifications: ${j.qualifications}, District: ${j.district}`).join('\n')}

    Please analyze the candidate's background against the job requirements.
    Return a JSON array of Job IDs that are high matches (top 3 maximum).
    Return ONLY the JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    
    const responseText = response.text || "";
    const match = responseText.match(/\[.*\]/s);
    if (match) {
      const jobIds = JSON.parse(match[0]);
      return availableJobs.filter(j => jobIds.includes(j.id));
    }
  } catch (error) {
    console.error("AI Matching failed:", error);
  }
  
  // Fallback: simple occupation match
  return availableJobs
    .filter(j => j.occupation?.toLowerCase() === userProfile.occupation?.toLowerCase())
    .slice(0, 3);
}

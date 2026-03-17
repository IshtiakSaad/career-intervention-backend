import prisma from "../../utils/prisma";
import { AppError } from "../../errorHelpers/app-error";
import httpStatus from "http-status";
import { getAiCompletion } from "../../utils/aiHelper";

const suggestMentors = async (query: string) => {
  // 1. Fetch available mentors to provide as context (Basic Mock-RAG approach)
  // In a real production system with 1000s of mentors, you would use embeddings/pgvector here.
  const mentors = await prisma.mentorProfile.findMany({
    where: { activeStatus: true },
    include: {
      user: {
        select: { name: true, gender: true }
      },
      mentorSpecialties: {
        include: { specialty: true }
      },
      serviceOfferings: {
         where: { isActive: true },
         select: { title: true, price: true }
      }
    },
    take: 30 // Hard limit to avoid blowing up the LLM token context
  });

  if (mentors.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, "No active mentors found to suggest.");
  }

  // 2. Format the data concisely to save tokens
  const mentorContext = mentors.map((m) => ({
    mentorId: m.id,
    name: m.user.name,
    experienceYears: m.experience,
    bio: m.bio,
    designation: m.designation,
    specialties: m.mentorSpecialties.map(ms => ms.specialty.name),
    products: m.serviceOfferings.map(so => so.title)
  }));

  // 3. Construct the prompt
  const systemPrompt = `You are a helpful Career Platform Matchmaker API. Your only job is to return a JSON array of the top 3 mentor matches based on the user's query and the provided list of available mentors. 
Output ONLY valid JSON. Your response must be an array of objects. 
Each object must have exactly these keys:
- "mentorId" (string)
- "name" (string)
- "reason" (string, max 2 sentences explaining why they are a good fit for the user's query)

Do not wrap the JSON in markdown code blocks like \`\`\`json. Just start with [ and end with ].`;

  const userMessage = `User's Query: "${query}"\n\nAvailable Mentors:\n${JSON.stringify(mentorContext)}`;

  try {
    // 4. Call AI Helper
    const responseText = await getAiCompletion(systemPrompt, userMessage);
    
    // Attempt to parse the JSON
    const suggestedMentors = JSON.parse(responseText);
    return suggestedMentors;

  } catch (error: any) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to analyze profiles or parse AI response. " + error.message);
  }
};

export const AiService = {
  suggestMentors,
};

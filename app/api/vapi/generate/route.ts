import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  console.log("🚀 API /api/vapi/generate called");
  
  const { type, role, level, techstack, amount, userid } = await request.json();
  
  console.log("📦 Received data:", { type, role, level, techstack, amount, userid });

  // Validate required fields
  if (!type || !role || !level || !techstack || !amount || !userid) {
    console.error("❌ Missing required fields");
    return Response.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    console.log("🤖 Generating questions with Gemini...");
    
    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash") as unknown as LanguageModel, // ✅ FIXED: Changed from gemini-2.5-flash
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    console.log("✅ Questions generated:", questions);

    // Parse questions (with error handling)
    let parsedQuestions: string[];
    try {
      parsedQuestions = JSON.parse(questions);
    } catch (parseError) {
      console.error("❌ Failed to parse questions as JSON:", parseError);
      // Fallback: try to extract array-like content
      const match = questions.match(/\[(.*?)\]/s);
      if (match) {
        parsedQuestions = JSON.parse(`[${match[1]}]`);
      } else {
        throw new Error("Could not parse questions from AI response");
      }
    }

    console.log("📝 Parsed questions:", parsedQuestions);

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(",").map((tech: string) => tech.trim()),
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    console.log("💾 Saving interview to Firebase...");
    
    const docRef = await db.collection("interviews").add(interview);
    
    console.log("✅ Interview saved with ID:", docRef.id);

    return Response.json(
      { 
        success: true, 
        interviewId: docRef.id,
        message: "Interview created successfully" 
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  } catch (error: any) {
    console.error("❌ Error in generate API:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return Response.json(
      { 
        success: false, 
        error: error.message || "Failed to generate interview",
        errorType: error.name
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Interview API is running" }, { status: 200 });
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return Response.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
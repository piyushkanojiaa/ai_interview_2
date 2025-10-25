import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  console.log("🚀 Generate API called");
  
  try {
    const { type, role, level, techstack, amount, userid } = await request.json();
    
    console.log("📦 Request data:", { type, role, level, techstack, amount, userid });

    // Validate all required fields
    if (!type || !role || !level || !techstack || !amount || !userid) {
      console.error("❌ Missing required fields");
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("🤖 Generating questions with Gemini...");

    // ✅ OPTION 1: Use stable Gemini 1.5 Flash (RECOMMENDED)
    const { text: questions } = await generateText({
      model: google("gemini-1.5-flash-latest") as unknown as LanguageModel,
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

    // Parse the questions with error handling
    let parsedQuestions: string[];
    try {
      parsedQuestions = JSON.parse(questions);
    } catch (parseError) {
      console.error("❌ Failed to parse questions:", parseError);
      // Try to extract array from text
      const match = questions.match(/\[[\s\S]*\]/);
      if (match) {
        parsedQuestions = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse questions from AI response");
      }
    }

    console.log("📝 Parsed questions:", parsedQuestions);

    // Create interview object
    const interview = {
      role,
      type,
      level,
      techstack: techstack.split(",").map((tech: string) => tech.trim()),
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    console.log("💾 Saving to Firebase...");

    // Save to Firebase
    const docRef = await db.collection("interviews").add(interview);

    console.log("✅ Interview created successfully:", docRef.id);

    return Response.json(
      {
        success: true,
        interviewId: docRef.id,
        message: "Interview generated successfully",
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in generate API:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });

    return Response.json(
      {
        success: false,
        error: error.message || "Failed to generate interview",
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    { success: true, message: "Generate API is running" },
    { status: 200 }
  );
}

// Handle CORS preflight
export async function OPTIONS() {
  return Response.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
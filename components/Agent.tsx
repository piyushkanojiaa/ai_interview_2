"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  // Debug environment variables
  console.log("Agent component initialized with:", {
    type,
    userName,
    userId,
    interviewId,
    feedbackId,
    questionsCount: questions?.length || 0,
    vapiToken: process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ? "Present" : "Missing",
    workflowId: process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID ? "Present" : "Missing"
  });
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = (error: Error) => {
      console.error("VAPI Error:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        error: error,
      });
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("handleGenerateFeedback - Starting with messages:", messages.length);

      try {
        const result = await createFeedback({
          interviewId: interviewId!,
          userId: userId!,
          transcript: messages,
          feedbackId,
        });

        console.log("createFeedback result:", result);

        if (result.success && result.feedbackId) {
          router.push(`/interview/${interviewId}/feedback`);
        } else {
          console.error("Error saving feedback:", result);
          router.push("/");
        }
      } catch (error) {
        console.error("Exception in handleGenerateFeedback:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          error: error,
        });
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  // components/Agent.tsx

  const handleCall = async () => {
      setCallStatus(CallStatus.CONNECTING);

      try {
          console.log("Starting VAPI call for type:", type);
          
          let variableValues: Record<string, any> = {};
          const WORKFLOW_ID = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID; // Check for ID

          if (type === "generate") {
              // --- FIX 1: Workflow Start ---
              if (!WORKFLOW_ID) {
                  console.error("Vapi Workflow ID is missing for 'generate' type.");
                  setCallStatus(CallStatus.INACTIVE);
                  return;
              }
              
              variableValues = {
                  username: userName,
                  userid: userId,
              };
              
              // Call Vapi with 3x undefined, then the WORKFLOW_ID
              await vapi.start(
                  undefined, 
                  undefined, 
                  undefined,
                  WORKFLOW_ID, // <-- Pass the Workflow ID here (4th argument)
                  { variableValues }
              );
              // -----------------------------
              
          } else {
              // --- Normal Interview (Assistant Start) ---
              let formattedQuestions = "";
              if (questions) {
                  formattedQuestions = questions
                      .map((question) => `- ${question}`)
                      .join("\n");
              }
              variableValues = {
                  questions: formattedQuestions,
              };
              
              // Call Vapi with the Assistant ID/Object
              await vapi.start(interviewer, {
                  variableValues,
              });
              // ------------------------------------------
          }
          
          console.log("VAPI variableValues:", variableValues);
          
      } catch (error) {
          console.error("Error starting VAPI call:", {
              message: error instanceof Error ? error.message : 'Unknown error',
              error: error,
          });
          setCallStatus(CallStatus.INACTIVE);
      }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100",
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden",
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;

import Vapi from "@vapi-ai/web";

console.log("Initializing VAPI with token:", process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ? "Token present" : "Token missing");

export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);

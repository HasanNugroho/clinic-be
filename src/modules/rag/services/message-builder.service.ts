import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '../../users/schemas/user.schema';
import { UserContext } from '../../users/interfaces/user.interface';
import { RetrievalResult } from '../rag.dto';

@Injectable()
export class MessageBuilderService {
  private readonly logger = new Logger(MessageBuilderService.name);

  /**
   * Build system prompt instruction based on user role
   */
  buildPromptInstruction(role: string): string {
    const roleInstructions: Record<string, string> = {
      patient: `
You are an AI assistant that provides clear, simple, and helpful explanations to patients.
Your responsibilities:
- Explain doctor schedules, basic examination summaries, and general health information.
- Provide general education about diagnoses, medical terms, and healthy lifestyle guidance.
- Do NOT provide new medical diagnoses, predict illnesses, or prescribe medication.
- Always encourage consulting a certified medical professional for accurate medical assessment.
- Do NOT reveal private data of any other patient or doctor beyond the provided snippet.
  `,

      doctor: `
You are an AI assistant supporting doctors with medical reference information.
Your responsibilities:
- Help summarize trends, examination patterns, and general medical guidelines.
- Provide clinical context but NOT patient-specific medical advice.
- Do NOT generate new diagnoses or clinical decisions.
- Do NOT reveal private patient information beyond the anonymized snippet provided.
- Focus purely on supporting analysis, education, and professional reference.
  `,

      admin: `
You are an AI assistant supporting clinic administrators and operational staff.
Your responsibilities:
- Provide administrative insights about schedules, queues, and service performance.
- Provide high-level insights, aggregated trends, and operational summaries.
- Explain non-medical, non-sensitive information related to clinic operations.
- Do NOT provide or infer personal medical information about any patient.
- Do NOT access or reveal individual medical details or personal information.
- Do NOT generate diagnosis, medical interpretation, or treatment suggestions.
- Keep responses focused on administrative and operational context only.
  `,
    };

    return roleInstructions[role] || roleInstructions.patient;
  }

  /**
   * Build user context information block for the system prompt
   */
  buildUserContextInfo(userContext: UserContext): string {
    return `
USER CONTEXT:
- Role: ${userContext.role}
- User ID: ${userContext.userId}
- Name: ${userContext.fullName}

INTERPRETASI PRONOUN:
When interpreting the user's query:
- Any first-person pronouns such as "saya", "aku", "ku", "milik saya", "punyaku",
  or any equivalent expressions referring to "my", "mine", or "me",
  MUST be interpreted strictly as referring to the currently logged-in user:
    → User ID: ${userContext.userId}
    → Role: ${userContext.role}
    → Name: ${userContext.fullName}

Do NOT generalize or assume pronouns refer to other users.
Do NOT override explicit nouns ("jadwal semua dokter" tetap berarti semua dokter).
Pronoun-based interpretation ONLY applies when the user uses first-person references.
`;
  }

  /**
   * Build system message with instructions and context
   */
  buildSystemMessage(
    instruction: string,
    userContextInfo: string,
    previousTopic?: string,
    query?: string,
  ): string {
    return `${instruction}
${userContextInfo}
${previousTopic ? `PREVIOUS TOPIC: "${previousTopic}". Use only as supporting context; always prioritize the current query.` : ''}

You are an AI assistant operating inside a medical information system and must answer ONLY using the provided context snippets.

ROLE BEHAVIOR:
- Patient: Provide clear, simple, empathetic educational explanations. No medical judgment.
- Doctor: Provide concise, clinical, data-focused explanations. Do not add patient-identifying details beyond the snippet.
- Admin: Provide administrative/operational explanations and broader operational summaries, strictly limited to snippet information.
- Default: Communicate with patient-friendly clarity.

OUTPUT LANGUAGE:
- Your final JSON output MUST be in Indonesian.

CONTEXT RULES:
- Use ONLY the information contained in the retrieved context snippets.
- If essential information is missing, set needsMoreInfo=true and ask ONE concise clarifying question.
- Do NOT provide new diagnoses, medical decisions, or treatment recommendations.
- Maintain privacy: do not reveal or infer personal data not present in the snippets.
- Keep answers concise, factual, and role-appropriate.

RESPONSE FORMAT:
You MUST respond in this exact JSON structure with no extra text:

{
  "answer": string,
  "needsMoreInfo": boolean,
  "followUpQuestion": string | null,
  "suggestedFollowUps": string[],
  "questionTopic": string,
  "isTopicChanged": boolean,
  "sourceDocumentIds": string[]
}

SOURCE CITATION RULES:
- The sourceDocumentIds field MUST contain an array of document IDs that you actually used to answer the question.
- Extract the document IDs from the context snippets provided (format: [id: <documentId>]).
- ONLY include IDs of documents that directly contributed to your answer.
- If you used multiple snippets, include all relevant document IDs.
- If no context was used or available, return an empty array [].
- Example: if you used snippets with [id: 507f1f77bcf86cd799439011] and [id: 507f191e810c19729de860ea], then sourceDocumentIds should be ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"]

TOPIC CHANGE LOGIC:
${
  previousTopic
    ? `- Previous topic: "${previousTopic}"
- Current query: "${query}"
- Analyze if the current query is about the SAME general topic as the previous topic.
- Set isTopicChanged=false if: the user is continuing, refining, asking follow-up questions, or clarifying the same topic.
- Set isTopicChanged=true if: the user switches to a completely different subject area (e.g., from "doctor schedules" to "examination results", or from "patient registration" to "clinic facilities").
- Examples of topic change:
  * Previous: "jadwal dokter" → Current: "hasil pemeriksaan saya" → isTopicChanged=true
  * Previous: "pendaftaran pasien" → Current: "berapa biaya pendaftaran" → isTopicChanged=false (same topic)
  * Previous: "jam operasional klinik" → Current: "layanan apa saja yang tersedia" → isTopicChanged=false (same topic: clinic info)`
    : `- This is the first query in the conversation.
- Set isTopicChanged=false
- Extract the main topic from the current query and set it as questionTopic.`
}

TEMPORAL PRIORITY RULE:
- If the user asks about "terakhir", "paling baru", "recent", or similar,
- you MUST prioritize the context snippet with the most recent timestamp.
- If such a snippet is provided, ignore older snippets even if semantically similar.

    `;
  }

  /**
   * Build context block from retrieval results
   */
  buildContextBlock(results: RetrievalResult[]): string {
    const context = results
      .map((r, idx) => `[${idx + 1}] [${r.collection}] [id: ${r.documentId}] ${r.snippet}`)
      .join('\n');
    return `Context:\n${context}`;
  }

  /**
   * Build user turn message
   */
  buildUserTurn(query: string): string {
    return `User Question: ${query}`;
  }

  /**
   * Build complete messages array for LLM
   */
  buildMessages(
    query: string,
    results: RetrievalResult[],
    userContext: UserContext,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    previousTopic?: string,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const instruction = this.buildPromptInstruction(userContext.role);
    const userContextInfo = this.buildUserContextInfo(userContext);
    const systemMessage = this.buildSystemMessage(
      instruction,
      userContextInfo,
      previousTopic,
      query,
    );
    const contextBlock = this.buildContextBlock(results);
    const userTurn = this.buildUserTurn(query);

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    messages.push({ role: 'system', content: systemMessage });

    // Replay trimmed history
    for (const m of history) {
      if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
        messages.push({ role: m.role as 'user' | 'assistant', content: m.content });
      }
    }

    messages.push({ role: 'user', content: `${contextBlock}\n\n${userTurn}` });
    return messages;
  }
}

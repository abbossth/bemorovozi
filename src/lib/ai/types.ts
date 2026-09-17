export type Severity = "past" | "orta" | "yuqori";

export type ClassificationInput = {
  transcript: string;
  departmentName: string;
  availableDepartments: string[];
};

export type ClassificationResult = {
  severity: Severity;
  summary: string;
  suggestedDepartment: string;
  /** Short, normalized snake_case tag used for issue clustering, e.g. "dori_vaqtida_berilmadi" */
  issueTag: string;
};

export type VoiceTurn = { role: "ai" | "patient"; text: string };

export type VoiceDialogueResult = {
  reply: string;
  /** true once the assistant has gathered enough detail and the conversation should end */
  done: boolean;
};

export interface AiProvider {
  classifyFeedback(input: ClassificationInput): Promise<ClassificationResult>;
  voiceDialogueTurn(history: VoiceTurn[]): Promise<VoiceDialogueResult>;
}

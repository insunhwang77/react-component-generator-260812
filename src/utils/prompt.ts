export const MAX_PROMPT_LENGTH = 500;

export function clampPrompt(text: string): string {
  return text.slice(0, MAX_PROMPT_LENGTH);
}

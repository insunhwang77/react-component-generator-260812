import { describe, it, expect } from 'vitest';
import { clampPrompt, MAX_PROMPT_LENGTH } from './prompt';

describe('clampPrompt', () => {
  it('제한보다 짧은 문자열은 그대로 반환한다', () => {
    expect(clampPrompt('짧은 프롬프트')).toBe('짧은 프롬프트');
  });

  it(`${MAX_PROMPT_LENGTH}자를 초과하면 ${MAX_PROMPT_LENGTH}자로 잘라낸다`, () => {
    const tooLong = 'a'.repeat(MAX_PROMPT_LENGTH + 10);
    const result = clampPrompt(tooLong);
    expect(result).toBe('a'.repeat(MAX_PROMPT_LENGTH));
    expect(result.length).toBe(MAX_PROMPT_LENGTH);
  });

  it(`정확히 ${MAX_PROMPT_LENGTH}자면 그대로 반환한다`, () => {
    const exact = 'a'.repeat(MAX_PROMPT_LENGTH);
    expect(clampPrompt(exact)).toBe(exact);
  });
});

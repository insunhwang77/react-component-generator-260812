import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveComponentsToStorage,
  loadComponentsFromStorage,
  clearComponentsStorage,
} from './localStorage';
import type { GeneratedComponent } from '../types';

describe('localStorage utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveComponentsToStorage', () => {
    it('저장하지 않으면 빈 배열을 로드해야 한다', () => {
      const components = loadComponentsFromStorage();
      expect(components).toEqual([]);
    });

    it('컴포넌트를 저장하고 로드해야 한다', () => {
      const component: GeneratedComponent = {
        id: 'test-1',
        prompt: 'Test prompt',
        code: 'return <div>Test</div>;',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      saveComponentsToStorage([component]);
      const loaded = loadComponentsFromStorage();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('test-1');
      expect(loaded[0].prompt).toBe('Test prompt');
      expect(loaded[0].code).toBe('return <div>Test</div>;');
      expect(loaded[0].createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
    });

    it('여러 컴포넌트를 저장해야 한다', () => {
      const components: GeneratedComponent[] = [
        {
          id: 'test-1',
          prompt: 'Prompt 1',
          code: 'code 1',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'test-2',
          prompt: 'Prompt 2',
          code: 'code 2',
          createdAt: new Date('2024-01-02'),
        },
      ];

      saveComponentsToStorage(components);
      const loaded = loadComponentsFromStorage();

      expect(loaded).toHaveLength(2);
      expect(loaded[0].id).toBe('test-1');
      expect(loaded[1].id).toBe('test-2');
    });

    it('Date를 ISO 문자열로 변환하고 복원해야 한다', () => {
      const date = new Date('2024-06-15T12:30:45.123Z');
      const component: GeneratedComponent = {
        id: 'test-date',
        prompt: 'Test',
        code: 'code',
        createdAt: date,
      };

      saveComponentsToStorage([component]);
      const loaded = loadComponentsFromStorage();

      expect(loaded[0].createdAt).toEqual(date);
      expect(loaded[0].createdAt instanceof Date).toBe(true);
    });
  });

  describe('clearComponentsStorage', () => {
    it('저장된 컴포넌트를 삭제해야 한다', () => {
      const component: GeneratedComponent = {
        id: 'test-1',
        prompt: 'Test',
        code: 'code',
        createdAt: new Date(),
      };

      saveComponentsToStorage([component]);
      expect(loadComponentsFromStorage()).toHaveLength(1);

      clearComponentsStorage();
      expect(loadComponentsFromStorage()).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('localStorage 오류 시 빈 배열을 반환해야 한다', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = loadComponentsFromStorage();
      expect(result).toEqual([]);
      expect(result).toBeInstanceOf(Array);

      spy.mockRestore();
    });

    it('잘못된 JSON 데이터를 처리해야 한다', () => {
      localStorage.setItem('rcg_components', 'invalid json');

      const result = loadComponentsFromStorage();
      expect(result).toEqual([]);
    });

    it('저장 중 오류를 조용히 처리해야 한다', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const component: GeneratedComponent = {
        id: 'test-1',
        prompt: 'Test',
        code: 'code',
        createdAt: new Date(),
      };

      expect(() => saveComponentsToStorage([component])).not.toThrow();

      spy.mockRestore();
    });
  });
});

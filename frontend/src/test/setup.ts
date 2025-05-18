import { vi, beforeEach, afterEach } from 'vitest';

// 模拟 TextEncoder 和 TextDecoder
class MockTextEncoder {
  encode(input?: string): Uint8Array {
    return new Uint8Array(Buffer.from(input || ''));
  }
}

class MockTextDecoder {
  decode(input?: Uint8Array): string {
    return input ? Buffer.from(input).toString() : '';
  }
}

// 设置全局模拟
Object.defineProperty(window, 'TextEncoder', {
  value: MockTextEncoder,
  writable: true,
});

Object.defineProperty(window, 'TextDecoder', {
  value: MockTextDecoder,
  writable: true,
});

// 模拟 IndexedDB
class MockIDBFactory {
  open() {
    return {};
  }

  deleteDatabase() {
    return {};
  }
}

// 模拟 localStorage
class MockStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] || null;
  }

  get length(): number {
    return Object.keys(this.store).length;
  }
}

// 设置全局模拟
Object.defineProperty(window, 'indexedDB', {
  value: new MockIDBFactory(),
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: new MockStorage(),
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: new MockStorage(),
  writable: true,
});

// 模拟 navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  value: true,
});

// 模拟 console.error 以捕获错误
console.error = vi.fn();

// 清理函数
beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

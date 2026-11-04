/// <reference types="vite/client" />

/**
 * 类型补充：给 `content/loader.ts` 使用的最小全局声明。
 * Vite 已提供 `import.meta.glob` 的类型；这里只是把 glob 的返回值放宽到
 * 「可能不在 / 可能是任意 JSON」，因为 content/history.json 由 HIST 模块异步交付。
 */
export {};

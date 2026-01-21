import { mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'
import { playwright } from '@vitest/browser-playwright'

export default mergeConfig(viteConfig, {
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: { label: 'unit', color: 'blue' },
					include: ['tests/**/*.test.ts'],
					exclude: ['tests/integration/**/*.test.ts'],
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
					setupFiles: './tests/setup.ts',
					testTimeout: 30000,
					hookTimeout: 60000,
				},
			},
			{
				extends: './vite.config.ts',
				test: {
					name: { label: 'ollama', color: 'green' },
					include: ['tests/integration/ollama/**/*.test.ts'],
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
					setupFiles: ['./tests/integration/ollama/setup.ts'],
					// Longer timeouts for Ollama ollama
					testTimeout: 120_000,
					hookTimeout: 120_000,
					// Run sequentially to avoid overwhelming Ollama
					sequence: {
						concurrent: false,
					},
				},
				define: {
					'import.meta.env.VITE_OLLAMA_HOST': JSON.stringify(process.env.OLLAMA_HOST ?? 'http://localhost:11434'),
					'import.meta.env.VITE_OLLAMA_MODEL': JSON.stringify(process.env.OLLAMA_MODEL ?? 'qwen2.5:1.5b'),
					'import.meta.env.CI': JSON.stringify(process.env.CI ?? 'false'),
				},
			},
			{
				extends: './vite.config.ts',
				test: {
					name: { label: 'huggingface', color: 'yellow' },
					include: ['tests/integration/huggingface/**/*.test.ts'],
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
					// No setupFiles - each test file loads only the model it needs
					// Generous timeouts for model loading and inference
					testTimeout: 120_000, // 2 minutes per test
					hookTimeout: 600_000, // 10 minutes for beforeAll (model download)
					// Run tests sequentially to avoid memory issues
					sequence: {
						concurrent: false,
					},
				},
			},
		],
	},
})

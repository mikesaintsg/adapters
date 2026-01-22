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
					name: { label: 'integration', color: 'green' },
					include: ['tests/integration/**/*.test.ts'],
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
					setupFiles: ['./tests/integration/setup.ts'],
					// Longer timeouts for integration
					testTimeout: 120_000,
					hookTimeout: 120_000,
					// Run sequentially to avoid overwhelming integration
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
		],
	},
})

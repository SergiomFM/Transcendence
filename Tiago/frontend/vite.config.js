import { defineConfig } from 'vite';

export default defineConfig(
{
	server: {
		watch: {
			usePolling: true,
			interval: 100,
		},
	},
	root: '.',
	build:
	{
		outDir: '../public',
		emptyOutDir: true,
		rollupOptions:
		{
			output:
			{
				entryFileNames: 'assets/main.js'
			}
	}
	}
});
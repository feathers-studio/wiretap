// type-safe way to access global values that may not be available in all runtimes

export const context = globalThis as unknown as {
	// browsers
	document?: unknown;
	alert?: (message: string) => void;
	// Node, Deno, Bun
	process?: {
		env: { [key: string]: string };
		stderr: { isTTY: boolean };
		exit: (code: number) => void;
	};
	// Web, Deno Workers, Cloudflare Workers
	env?: { [key: string]: string };
	Deno?: {
		permissions: {
			querySync: (options: { name: string; variable: string }) => {
				state: string;
			};
		};
	};
	console: {
		// everywhere
		log?: (...args: unknown[]) => void;
		error?: (...args: unknown[]) => void;
		debug?: (...args: unknown[]) => void;
		// Node, Deno, Bun
		Console?: (stderr: unknown) => (typeof context)["console"];
	};
};

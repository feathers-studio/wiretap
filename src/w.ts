import { context } from "./types.ts";
import { colourNs, selectColour } from "./colours.ts";
import { env } from "./env.ts";
import { Namespaces } from "./namespacing.ts";

function noop() {}

const DEBUG: string = env("DEBUG");
const stderr = context.process?.stderr;
const useColour = stderr?.isTTY && !env("NO_COLOR");
const cons = context.console.Console?.(stderr) ?? context.console;
const pick = (level: "log" | "debug" | "error") => (cons[level] ?? cons.log ?? noop).bind(cons);
const ns = (n: string) => (n ? n + " " : "");

/**
 * The underlying namespace manager.
 */
export const namespaces: Namespaces = new Namespaces(DEBUG);

/**
 * A debug logger instance.
 */
export interface DebugFn {
	(...data: unknown[]): void;
	/**
	 * Manually enable or disable logging for this namespace.
	 */
	enabled: boolean;
	/**
	 * The underlying logger function. By default, this writes to `stderr`.
	 * To customise, assign a different logger function.
	 *
	 * @example
	 * ```ts
	 * const log = w("app");
	 * log.logger = console.log.bind(console);
	 * ```
	 */
	logger: (...args: unknown[]) => void;
	panic: (...args: unknown[]) => never;
}

/**
 * Create a debug instance for a namespace.
 *
 * @example
 * ```ts
 * import { w } from "w";
 * const log = w("app");
 * log("hello");
 * ```
 *
 * Logging for given namespace is enabled when the `DEBUG` environment variable includes the namespace.
 * Multiple namespaces can be enabled by separating them with commas.
 *
 * ```sh
 * DEBUG=app:init,app:auth,server:* bun run app.ts
 * ```
 *
 * @param namespace - The namespace to debug.
 * @returns A debug instance.
 */
export function w(namespace = ""): DebugFn {
	const debugfn = (...data: unknown[]) => {
		const start = data.length ? data.shift() : "";
		if (!debugfn.enabled) return;
		if (context.document)
			debugfn.logger(
				`%c${ns(namespace)}%c${start}`,
				`color: #${selectColour(namespace)[3]}`,
				"color: inherit",
				...data,
			);
		else {
			const name = useColour ? colourNs(namespace) : namespace;
			debugfn.logger(ns(name) + start, ...data);
		}
	};

	debugfn.enabled = namespaces.check(namespace);
	debugfn.logger = pick("debug");
	debugfn.panic = function panic(...data: unknown[]): never {
		const alertmsg = "PANIC! " + data.join(" ");
		if (env("W_PANIC_THROWS")) throw new Error(alertmsg);
		try {
			debugfn.logger = pick("error");
			debugfn.enabled = true;
			debugfn("PANIC! " + (data.shift() ?? ""), ...data, "\n");
			debugfn.logger(new Error());
		} catch {}
		debugger;
		for (;;)
			try {
				context.process?.exit(1);
				context.alert?.(alertmsg);
			} catch {}
	};

	return debugfn;
}

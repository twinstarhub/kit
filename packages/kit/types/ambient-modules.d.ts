declare module '$app/env' {
	/**
	 * Whether or not app is in AMP mode.
	 */
	export const amp: boolean;
	/**
	 * Whether the app is running in the browser or on the server.
	 */
	export const browser: boolean;
	/**
	 * `true` in development mode, `false` in production.
	 */
	export const dev: boolean;
}

declare module '$app/navigation' {
	/**
	 * Returns a Promise that resolves when SvelteKit navigates (or fails to navigate, in which case the promise rejects) to the specified href.
	 *
	 * @param href Where to navigate to
	 * @param opts Optional. If `replaceState` is `true`, a new history entry won't be created. If `noscroll` is `true`, the browser won't scroll to the top of the page after navigation.
	 */
	export function goto(
		href: string,
		opts?: { replaceState?: boolean; noscroll?: boolean }
	): Promise<any>;
	/**
	 * Programmatically prefetches the given page, which means a) ensuring that the code for the page is loaded, and b) calling the page's load function with the appropriate options.
	 * This is the same behaviour that SvelteKit triggers when the user taps or mouses over an `<a>` element with `sveltekit:prefetch`.
	 * If the next navigation is to `href`, the values returned from load will be used, making navigation instantaneous.
	 * Returns a Promise that resolves when the prefetch is complete.
	 *
	 * @param href Page to prefetch
	 */
	export function prefetch(href: string): Promise<any>;
	/**
	 * Programmatically prefetches the code for routes that haven't yet been fetched.
	 * Typically, you might call this to speed up subsequent navigation.
	 * If no argument is given, all routes will be fetched, otherwise you can specify routes by any matching pathname such as `/about` (to match `src/routes/about.svelte`)
	 * or `/blog/*` (to match `src/routes/blog/[slug].svelte`). Unlike prefetch, this won't call preload for individual pages.
	 * Returns a Promise that resolves when the routes have been prefetched.
	 */
	export function prefetchRoutes(routes?: string[]): Promise<any>;
}

declare module '$app/paths' {
	/**
	 * A root-relative (i.e. begins with a `/`) string that matches `config.kit.files.base` in your project configuration.
	 */
	export const base: string;
	/**
	 * A root-relative or absolute path that matches `config.kit.files.assets` (after it has been resolved against base).
	 */
	export const assets: string;
}

declare module '$app/stores' {
	import { Readable, Writable } from 'svelte/store';
	import { Page } from '@sveltejs/kit';

	/**
	 * A convenience function around `getContext` that returns `{ navigating, page, session }`.
	 * Most of the time, you won't need to use it.
	 */
	export function getStores(): {
		navigating: Readable<{ from: string; to: string } | null>;
		page: Readable<Page>;
		session: Writable<any>;
	};
	/**
	 * A readable store whose value reflects the object passed to load functions.
	 */
	export const page: Readable<Page>;
	/**
	 * A readable store.
	 * When navigating starts, its value is `{ from, to }`, where from and to both mirror the page store value.
	 * When navigating finishes, its value reverts to `null`.
	 */
	export const navigating: Readable<{ from: string; to: string } | null>;
	/**
	 * A writable store whose initial value is whatever was returned from `getSession`.
	 * It can be written to, but this will not cause changes to persist on the server — this is something you must implement yourself.
	 */
	export const session: Writable<any>;
}

declare module '$service-worker' {
	/**
	 * An array of URL strings representing the files generated by Vite, suitable for caching with `cache.addAll(build)`.
	 * This is only available to service workers.
	 */
	export const build: string[];
	/**
	 * An array of URL strings representing the files in your static directory,
	 * or whatever directory is specified by `config.kit.files.assets`.
	 * This is only available to service workers.
	 */
	export const files: string[];
	/**
	 * The result of calling `Date.now()` at build time.
	 * It's useful for generating unique cache names inside your service worker,
	 * so that a later deployment of your app can invalidate old caches.
	 * This is only available to service workers.
	 */
	export const timestamp: number;
}

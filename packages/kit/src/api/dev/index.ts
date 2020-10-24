import { parse, URLSearchParams } from 'url';
import { EventEmitter } from 'events';
import CheapWatch from 'cheap-watch';
import { scorta } from 'scorta/sync';
import * as ports from 'port-authority';
import sirv from 'sirv';
import { mkdirp } from '@sveltejs/app-utils';
import create_manifest_data from '../../core/create_manifest_data';
import { createServer, Server } from 'http';
import { create_app } from '../../core/create_app';
import snowpack, {SnowpackDevServer} from 'snowpack';
import pkg from '../../../package.json';
import loader from './loader';
import { ManifestData, ReadyEvent } from '../../interfaces';
import { render } from '@sveltejs/app-utils';
import { DevConfig, Loader } from './types';
import { copy_assets } from '../utils';
import { readFileSync } from 'fs';

export function dev(opts: DevConfig) {
	return new Watcher(opts);
}

class Watcher extends EventEmitter {
	cachedir: string;
	opts: DevConfig;
	manifest: ManifestData;

	cheapwatch: CheapWatch;

	snowpack_port: number;
	snowpack: SnowpackDevServer;
	server: Server;

	constructor(opts: DevConfig) {
		super();

		this.cachedir = scorta('svelte') as string;
		this.opts = opts;
		this.update();

		process.env.NODE_ENV = 'development';

		process.on('exit', () => {
			this.close();
		});

		this.init();
	}

	async init() {
		mkdirp('.svelte');

		copy_assets();

		await this.init_filewatcher();

		this.emit('ready', {
			port: this.opts.port
		} as ReadyEvent);
	}

	async init_filewatcher() {
		this.cheapwatch = new CheapWatch({
			dir: 'src/routes', // TODO make configurable...
			filter: ({ path }) => path.split('/').every(part => !part.startsWith('_'))
		});

		await this.cheapwatch.init();
		await this.init_snowpack();
		await this.init_server();

		// not sure why TS doesn't understand that CheapWatch extends EventEmitter
		(this.cheapwatch as any as EventEmitter).on('+', ({ isNew }) => {
			if (isNew) this.update();
		});

		(this.cheapwatch as any as EventEmitter).on('-', () => {
			this.update();
		});
	}

	async init_snowpack() {
		this.snowpack_port = await ports.find(this.opts.port + 1);
		this.snowpack = await snowpack.startDevServer({
			cwd: process.cwd(),
			config: snowpack.loadAndValidateConfig({
				config: 'snowpack.config.js',
				port: this.snowpack_port
			}, pkg),
			lockfile: null,
			pkgManifest: pkg
		});
	}

	async init_server() {
		const { port } = this.opts;
		const { snowpack_port } = this;
		const load: Loader = loader(this.snowpack);

		const static_handler = sirv('static', {
			dev: true
		});

		this.server = createServer(async (req, res) => {
			if (req.url === '/' && req.headers.upgrade === 'websocket') {
					return this.snowpack.handleRequest(req, res);
			}

			static_handler(req, res, async () => {
				try {
					await this.snowpack.handleRequest(req, res, {handleError: false});
					return;
				} catch (err) {
					if (err.message !== 'NOT_FOUND') {
						this.snowpack.sendResponseError(req, res, 500);
						return;
					}
				}

				const template = readFileSync('src/app.html', 'utf-8').replace(
					'</head>',
					`
						<script>window.HMR_WEBSOCKET_URL = \`ws://localhost:${snowpack_port}\`;</script>
						<script type="module" src="http://localhost:3000/__snowpack__/hmr-client.js"></script>
						<script type="module" src="http://localhost:3000/__snowpack__/hmr-error-overlay.js"></script>
					</head>`.replace(/^\t{6}/gm, '')
				);

				const parsed = parse(req.url);
				let setup;

				try {
					setup = await load(`/_app/setup/index.js`);
				} catch (err) {
					if (!err.message.endsWith('NOT_FOUND')) throw err;
					setup = {};
				}

				let root;
				
				try {
					root = await load(`/_app/main/root.js`);

					if (!root.default) {
						res.statusCode = 500;
						res.end('Failed to load root component');
						return
					}
				}
				catch (e) {
					res.statusCode = 500;
					res.end(e.toString());
					return
				}

				const rendered = await render({
					host: null, // TODO what should this be? is it necessary?
					headers: req.headers,
					method: req.method,
					path: parsed.pathname,
					query: new URLSearchParams(parsed.query)
				}, {
					static_dir: 'static',
					template,
					manifest: this.manifest,
					client: {
						entry: 'main/client.js',
						deps: {}
					},
					files: 'build',
					dev: true,
					root,
					setup,
					load: route => load(route.url.replace(/\.\w+$/, '.js')) // TODO is the replace still necessary?
				});

				if (rendered) {
					res.writeHead(rendered.status, rendered.headers);
					res.end(rendered.body);
				}

				else {
					res.statusCode = 404;
					res.end('Not found');
				}
			});
		});

		this.server.listen(port);
	}

	update() {
		this.manifest = create_manifest_data('src/routes'); // TODO make configurable, without breaking Snowpack config

		create_app({
			manifest_data: this.manifest,
			routes: '/_app/routes',
			output: '.svelte/main'
		});
	}

	close() {
		if (this.server) this.server.close();
	}
}

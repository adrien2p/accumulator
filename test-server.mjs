import http from 'http';
import url from 'url';

let requestCount = 0, connectionOpenCount = 0;

function logReq(req) {
	const query = url.parse(req.url, true).query;
	console.log(
		'------------------------------------------\n\n',
		'connections', connectionOpenCount, '\n',
		'requests', requestCount, '\n',
		'data', JSON.stringify(query), '\n',
		'remote ip', req.socket.remoteAddress, '\n',
		'headers', req.headers
	);
}

http.createServer(function (req, res) {
	++requestCount;
	++connectionOpenCount;
	logReq(req);
	res.on('finish', () => {
		--connectionOpenCount;
	});
	res.end('Hello World');
}).listen(3000, () => {
	console.log('---> Server listening on port 3000');
});

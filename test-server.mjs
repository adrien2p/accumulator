import http from 'http';
import url from 'url';

function logReq(req) {
	const query = url.parse(req.url, true).query;
	console.log(JSON.stringify(query), req.socket.remoteAddress, req.headers);
}

http.createServer(function (req, res) {
	logReq(req);
	res.end();
}).listen(3000, () => {
	console.log('---> Server listening on port 3000');
});
/*

http.createServer(function (req, res) {
	logReq(req);
	res.end();
}).listen(3001, () => {
	console.log('---> Server listening on port 3001');
});

http.createServer(function (req, res) {
	logReq(req);
	res.end();
}).listen(3002, () => {
	console.log('---> Server listening on port 3002');
});*/

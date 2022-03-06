import http from 'http';
import url from 'url';

function logReq(req) {
	const query = url.parse(req.url, true).query;
	console.log(JSON.stringify(query), req.connection.remoteAddress, req.socket.remoteAddress, req.headers);
}

http.createServer(function (req, res) {
	logReq(req);
	res.end();
}).listen(3000, () => {
	console.log('---> Server listening on port 3000');
});

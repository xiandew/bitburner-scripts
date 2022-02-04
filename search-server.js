/** @param {NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	if (!target) return;
	var serversVisited = {};

	var path = search("home", []);
	function search(server, path) {
		if (server == target) {
			return path;
		}

		serversVisited[server] = null;

		var connectedServers = ns.scan(server);
		if (connectedServers.length) {
			var _path = null;
			for (var connectedServer of connectedServers) {
				if (connectedServer in serversVisited) {
					continue;
				}
				if (!_path) _path = search(connectedServer, path.concat(server));
			}
			return _path;
		} else {
			return null;
		}
	}

	ns.print(JSON.stringify(path, null, 2));
}
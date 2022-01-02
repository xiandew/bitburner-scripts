/** @param {NS} ns **/
export function getAllServers(ns) {
	var servers = {};
	_getAllServers("home");
	function _getAllServers(server) {
		servers[server] = null;

		var connectedServers = ns.scan(server);
		if (connectedServers.length) {
			for (var connectedServer of connectedServers) {

				if (connectedServer in servers) {
					continue;
				}

				_getAllServers(connectedServer);
			}
		}
	}

	return Object.keys(servers);
}

/** @param {NS} ns **/
export function getAllHackableServers(ns) {
	var allServers = getAllServers(ns);

	return allServers.filter(function (e) {
		return ns.hasRootAccess(e) && ns.getServerMaxMoney(e) > 0 && ns.hackAnalyzeChance(e) > .6;
	});
}
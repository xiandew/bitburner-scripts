import { getAllServers } from "list-servers.js";

/** @param {NS} ns **/
export async function main(ns) {
	var scriptHack = "hack.js";
	var scriptsDep = ["math.js", "list-servers.js"];

	var portCrackerNames = ["BruteSSH", "FTPCrack", "relaySMTP", "HTTPWorm", "SQLInject"];
	var portCrackers = portCrackerNames.reduce((a, c) => (ns.fileExists(`${c}.exe`, "home") ? [c.toLocaleLowerCase()] : []).concat(a), []);

	for (var server of getAllServers(ns)) {
		if (server == "home") {
			var homeFreeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
			var scriptRam = ns.getScriptRam(scriptHack, server);
			var numThreads = Math.floor(homeFreeRam / scriptRam);

			if (numThreads) {
				await ns.exec(scriptHack, server, numThreads);
			}

			continue;
		}


		await deployHackScript(server);
	}

	async function deployHackScript(server) {
		if (!ns.hasRootAccess(server) && portCrackers.length >= ns.getServerNumPortsRequired(server)) {
			portCrackers.forEach(function (portCracker) {
				ns[portCracker](server);
			});
			ns.nuke(server);
		}

		await ns.killall(server);
		var serverMaxRam = ns.getServerMaxRam(server);
		var scriptRam = ns.getScriptRam(scriptHack, server);
		var numThreads = Math.floor(serverMaxRam / scriptRam);

		for (var script of [scriptHack].concat(scriptsDep)) {
			await ns.scp(script, server);
		}

		if (numThreads) await ns.exec(scriptHack, server, numThreads);
	}

	while (true) {
		var prevNumPortCrackers = portCrackers.length;
		portCrackerNames.forEach(function (e) {
			var portCracker = e.toLocaleLowerCase();
			if (ns.fileExists(`${e}.exe`, "home") && portCrackers.indexOf(portCracker) < 0) {
				portCrackers.push(portCracker);
			}
		});

		if (portCrackers.length > prevNumPortCrackers) {
			for (var server of getAllServers(ns)) {
				if (!ns.scriptRunning(scriptHack, server)) {
					await deployHackScript(server);
				}
			}
		}

		await ns.sleep(100);
	}
}
import { getAllServers } from "list-servers.js";

/** @param {NS} ns **/
export async function main(ns) {
	var scriptHack = "hack.js";
	var scriptsDep = ["math.js", "list-servers.js"];

	var portCrackers = [
		"BruteSSH.exe",
		"FTPCrack.exe",
		"relaySMTP.exe",
		"HTTPWorm.exe",
		"SQLInject.exe"
	].reduce((a, c) => {
		a[c] = { loaded: ns.fileExists(c, "home") };
		return a;
	}, {});

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

	function getNumLoadedPortCrackers() {
		return Object.keys(portCrackers).filter((e) => portCrackers[e].loaded).length;
	}

	async function deployHackScript(server) {
		if (!ns.hasRootAccess(server) && getNumLoadedPortCrackers() >= ns.getServerNumPortsRequired(server)) {
			Object.keys(portCrackers).forEach((e) => {
				if (portCrackers[e].loaded) {
					if (e === "BruteSSH.exe") ns.brutessh(server);
					if (e === "FTPCrack.exe") ns.ftpcrack(server);
					if (e === "relaySMTP.exe") ns.relaysmtp(server);
					if (e === "HTTPWorm.exe") ns.httpworm(server);
					if (e === "SQLInject.exe") ns.sqlinject(server);
				}
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
		var prevNumLoadedPortCrackers = getNumLoadedPortCrackers();
		Object.keys(portCrackers).forEach(function (e) {
			portCrackers[e].loaded = ns.fileExists(e, "home");
		});

		var currNumLoadedPortCrackers = getNumLoadedPortCrackers();
		if (currNumLoadedPortCrackers > prevNumLoadedPortCrackers) {
			for (var server of getAllServers(ns)) {
				if (!ns.scriptRunning(scriptHack, server)) {
					await deployHackScript(server);
				}
			}
		}

		if (currNumLoadedPortCrackers === Object.keys(portCrackers).length) {
			break;
		}

		await ns.sleep(100);
	}
}
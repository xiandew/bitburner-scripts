import math from "math.js";
import { getAllHackableServers } from "list-servers.js";

export async function main(ns) {
	// return ns.print(math.identity(2), math.inv(math.identity(2)));
	// return ns.print(math.transpose([[1, 2, 3]]));
	// return ns.print(math.kron([1, 2, 3], [[1], [2], [3]]));
	// return ns.print(math.multiply([[1,2],[0,1]], [1, 1]));

	var servers = getAllHackableServers(ns);
	var features = [
		ns.getServerMaxMoney,
		ns.hackAnalyze,
		ns.hackAnalyzeChance,
		ns.getHackTime,
		ns.getServerGrowth,
		ns.getGrowTime,
		ns.getServerMinSecurityLevel,
		ns.getWeakenTime
	];

	function expectedHackProfit(server) {
		return (
			ns.getServerMaxMoney(server) *
			ns.hackAnalyze(server) *
			ns.hackAnalyzeChance(server) /
			(
				ns.getHackTime(server) +
				ns.getGrowTime(server) / ns.getServerGrowth(server) +
				ns.getWeakenTime(server)
			)
		);
	}

	var linUCB = new LinUCB({
		ndims: features.length,
		arms: servers,
		tiebreaker: expectedHackProfit
	});

	// return ns.print(linUCB);

	while (true) {
		linUCB.addArms(getAllHackableServers(ns));

		var server = linUCB.play(
			linUCB.arms.reduce((a, server) => {
				a[server] = features.map((feature) => feature(server));
				return a;
			}, {})
		);

		var moneyThresh = ns.getServerMaxMoney(server) * 0.75;
		var securityThresh = ns.getServerMinSecurityLevel(server) + 5;
		var reward = 0;
		var securityLevel = ns.getServerSecurityLevel(server);
		var moneyAvailable = ns.getServerMoneyAvailable(server);
		if (securityLevel > securityThresh) {
			reward = -ns.getWeakenTime(server) * expectedHackProfit(server);
			reward += (await ns.weaken(server)) / (securityLevel - securityThresh) * moneyAvailable;
		} else if (moneyAvailable < moneyThresh) {
			reward = -(ns.getGrowTime(server) / ns.getServerGrowth(server) * expectedHackProfit(server));
			reward += moneyAvailable * ((await ns.grow(server)) - 1) / (moneyThresh - moneyAvailable) * moneyThresh;
		} else {
			reward = await ns.hack(server);
		}

		linUCB.update(
			server,
			reward,
			linUCB.arms.reduce((a, server) => {
				a[server] = features.map((feature) => feature(server));
				return a;
			}, {})
		);
	}
}

class LinUCB {
	constructor(config) {
		if (!(Array.isArray(config.arms) && config.arms.length > 0)) return;

		this.alpha = config.alpha || 1.0;
		this.ndims = config.ndims;
		this.A = {};
		this.b = {};
		this.arms = [];
		this.addArms(config.arms);

		this.tiebreaker = config.tiebreaker || null;
	}

	addArms(arms) {
		arms.forEach((e) => {
			if (this.arms.indexOf(e) < 0) {
				this.A[e] = math.identity(this.ndims);
				this.b[e] = math.zeros(this.ndims);
				this.arms.push(e);
			}
		});
	}

	play(context) {

		var theta = this.arms.reduce((a, arm) => {
			a[arm] = math.multiply(math.inv(this.A[arm]), this.b[arm]);
			return a;
		}, {});

		var p = this.arms.reduce((a, arm) => {
			a[arm] =
				math.multiply(theta[arm], context[arm]) +
				this.alpha * math.sqrt(math.multiply(math.multiply(context[arm], math.inv(this.A[arm])), context[arm]));
			return a;
		}, {})

		var pmax = Math.max(...Object.values(p));
		var candidates = Object.keys(p).filter((e) => { return p[e] === pmax; });

		if (this.tiebreaker) {
			return candidates.reduce(
				(a, c) => {
					var tiebreakerValue = this.tiebreaker(c);
					if (tiebreakerValue > a.tiebreakerValue) {
						a.arm = c;
						a.tiebreakerValue = tiebreakerValue;
					}
					return a;
				},
				{ arm: null, tiebreakerValue: -Infinity }
			).arm;
		} else {
			return candidates[Math.floor(Math.random() * candidates.length)];
		}
	}

	update(arm, reward, context) {
		this.A[arm] = math.add(this.A[arm], math.kron(context[arm], math.transpose([context[arm]])));
		this.b[arm] = math.add(this.b[arm], math.multiply(reward, context[arm]));
	}
}
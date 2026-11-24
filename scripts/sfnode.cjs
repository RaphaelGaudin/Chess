// Small promise wrapper around stockfish.js for Node scripts
const initEngine = require("stockfish");
function createEngine() {
  return new Promise((resolve) => {
    let listeners = [];
    const eng = initEngine("lite-single", (line) => { listeners.forEach((l) => l(line)); });
    const send = (c) => eng.processCommand(c);
    const waitFor = (pred) => new Promise((res) => {
      const l = (line) => { if (pred(line)) { listeners = listeners.filter((x) => x !== l); res(line); } };
      listeners.push(l);
    });
    const api = {
      send,
      async ready() { const p = waitFor((l) => l === "readyok"); send("isready"); await p; },
      async analyse(fen, { depth = 12, multipv = 1 } = {}) {
        const lines = {};
        const l = (line) => {
          if (!line.startsWith("info") || !line.includes(" pv ")) return;
          const mp = +(line.match(/ multipv (\d+)/) || [0, 1])[1];
          const d = +line.match(/ depth (\d+)/)[1];
          const cp = line.match(/ score cp (-?\d+)/); const mate = line.match(/ score mate (-?\d+)/);
          const pv = line.split(" pv ")[1].trim().split(" ");
          lines[mp] = { depth: d, cp: cp ? +cp[1] : null, mate: mate ? +mate[1] : null, pv };
        };
        listeners.push(l);
        send(`setoption name MultiPV value ${multipv}`);
        send(`position fen ${fen}`);
        const p = waitFor((x) => x.startsWith("bestmove"));
        send(`go depth ${depth}`);
        const bm = await p;
        listeners = listeners.filter((x) => x !== l);
        return { best: bm.split(" ")[1], lines: Object.keys(lines).sort().map((k) => lines[k]) };
      },
      quit() { eng.terminate && eng.terminate(); },
    };
    send("uci");
    api.ready().then(() => resolve(api));
  });
}
module.exports = { createEngine };

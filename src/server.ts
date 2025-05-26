import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";

import fetch, { Response as FetchResponse } from "node-fetch";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const ANTPP_ENDPOINT = "http://localhost:3000/archive";

// regex to validate xorname (64-character hex)
const XORNAME_REGEX = /^[a-f0-9]{64}$/i;

// in-memory job queue
type FetchJob = { address: string; ws: WebSocket };
const queue: FetchJob[] = [];
let activeJobs = 0;
const MAX_CONCURRENT = 5;
const TIMEOUT_MS = 10000;

// initialize websocket server
const wss = new WebSocketServer({ port: PORT });
console.log(`✅ websocket server running on port ${PORT}`);

// process jobs from queue
function processQueue() {
    if (activeJobs >= MAX_CONCURRENT || queue.length === 0) return;

    const job = queue.shift();
    if (!job) return;

    activeJobs++;

    fetchWithTimeout(`${ANTPP_ENDPOINT}/${job.address}`, TIMEOUT_MS)
        .then((res) => {
            if (!res.ok) throw new Error(`http ${res.status}`);
            return res.text();
        })
        .then((data) => {
            job.ws.send(data);
        })
        .catch((err) => {
            job.ws.send(`error fetching: ${err.message}`);
        })
        .finally(() => {
            activeJobs--;
            processQueue();
        });
}

// helper to fetch with timeout
async function fetchWithTimeout(
    url: string,
    timeoutMs: number
): Promise<FetchResponse> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
}

// handle websocket connections
wss.on("connection", (ws: WebSocket, req) => {
    const ip = req.socket.remoteAddress || "unknown";

    ws.on("message", (message: string | Buffer) => {
        const address = message.toString().trim();

        // validate xorname
        if (!XORNAME_REGEX.test(address)) {
            return ws.send("invalid address format");
        }

        // enqueue job
        queue.push({ address, ws });
        processQueue();
    });

    ws.on("close", () => {
        console.log(`client disconnected from ${ip}`);
    });
});

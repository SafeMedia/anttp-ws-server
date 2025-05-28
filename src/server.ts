import http from "http";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import fetch, { Response as FetchResponse } from "node-fetch";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8081;
const ANTPP_ENDPOINT =
    process.env.ANTPP_ENDPOINT || "http://localhost:8080/archive";
const XORNAME_REGEX = /^[a-f0-9]{64}$/i;

type FetchJob = { address: string; ws: WebSocket };
const queue: FetchJob[] = [];
let activeJobs = 0;
const MAX_CONCURRENT = 5;
const TIMEOUT_MS = 10000;

// Create HTTP server for Railway
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("✨ WebSocket server is live ✨");
});

// Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });
console.log(`✅ WebSocket server initialized.`);

// Handle connections
wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress || "unknown";
    console.log(`👤 Client connected from ${ip}`);

    ws.on("message", (message: string | Buffer) => {
        const address = message.toString().trim();
        console.log(`📩 Message received: ${address}`);

        if (!XORNAME_REGEX.test(address)) {
            return ws.send("invalid address format");
        }

        queue.push({ address, ws });
        processQueue();
    });

    ws.on("close", () => {
        console.log(`❌ Client disconnected from ${ip}`);
    });
});

// Start listening
server.listen(PORT, () => {
    console.log(`✅ HTTP + WebSocket server running on port ${PORT}`);
});

// Job processing
function processQueue() {
    if (activeJobs >= MAX_CONCURRENT || queue.length === 0) return;

    const job = queue.shift();
    if (!job) return;

    activeJobs++;

    fetchWithTimeout(`${ANTPP_ENDPOINT}/${job.address}`, TIMEOUT_MS)
        .then(async (res) => {
            if (!res.ok) throw new Error(`http ${res.status}`);

            const mimeType =
                res.headers.get("content-type") || "application/octet-stream";

            console.log("mimeType: ", mimeType);
            console.log("res: ", res);

            const buffer = await res.arrayBuffer();

            // Prepare JSON metadata
            const metadata = JSON.stringify({ mimeType });
            const metadataBuffer = Buffer.from(metadata, "utf-8");

            // 4-byte header for metadata length
            const headerBuffer = Buffer.alloc(4);
            headerBuffer.writeUInt32BE(metadataBuffer.length, 0);

            // Final payload: [header][metadata][binary]
            const combined = Buffer.concat([
                headerBuffer,
                metadataBuffer,
                Buffer.from(buffer),
            ]);

            job.ws.send(combined);
        })
        .catch((err) => {
            console.error(`❌ Error fetching from ANTPP: ${err.message}`);
            job.ws.send(`error fetching: ${err.message}`);
        })
        .finally(() => {
            activeJobs--;
            processQueue();
        });
}

// Fetch with timeout
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

import WebSocket, { WebSocketServer } from "ws";
import { spawn } from "child_process";

// server sets the port here, fallback to 8080
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws: WebSocket) => {
    console.log("Client connected");

    ws.on("message", (message: WebSocket.Data) => {
        const dataMapAddress = message.toString().trim();
        console.log(`Fetching file for address: ${dataMapAddress}`);

        // run anttp get command with the given address
        const ant = spawn("anttp", ["get", dataMapAddress]);

        let fileData = "";

        ant.stdout.on("data", (chunk: Buffer) => {
            fileData += chunk.toString();
        });

        ant.stderr.on("data", (err: Buffer) => {
            console.error(`anttp error: ${err.toString()}`);
        });

        ant.on("close", (code: number) => {
            if (code === 0) {
                ws.send(fileData);
            } else {
                ws.send(`Error fetching file for address: ${dataMapAddress}`);
            }
        });
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

console.log(`WebSocket server started on port ${PORT}`);

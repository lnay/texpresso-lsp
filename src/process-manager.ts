import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";

export class TexpressoProcessManager extends EventEmitter {
    private process: ChildProcess | null = null;
    private isRunning: boolean = false;

    constructor(
        private executablePath: string,
        private args: string[],
        private rootTex: string
    ) {
        super();
        this.args.push(this.rootTex);
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error("Texpresso process is already running");
        }

        try {
            this.process = spawn(this.executablePath, this.args, {
                stdio: ["pipe", "pipe", "pipe"],
            });

            this.isRunning = true;

            this.process.stdout?.on("data", (data: Buffer) => {
                data.toString()
                    .split("\n")
                    .filter((line) => line != "")
                    .map((line) => JSON.parse(line))
                    .forEach((command_list) => {
                        const command = command_list[0];
                        const data = command_list.slice(1);
                        this.emit(command, data);
                    });
            });

            this.process.stderr?.on("data", (data: Buffer) => {
                this.emit("stderr", data.toString());
            });

            this.process.on("error", (error: Error) => {
                this.emit("error", error);
            });

            this.process.on(
                "exit",
                (code: number | null, signal: NodeJS.Signals | null) => {
                    this.isRunning = false;
                    this.emit("exit", { code, signal });
                },
            );

            // Wait for process to start
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Process start timeout"));
                }, 5000);

                const stdout = this.process?.stdout;
                if (!stdout) {
                    clearTimeout(timeout);
                    reject(new Error("Process stdout not available"));
                    return;
                }

                stdout.on("data", () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
        } catch (error) {
            this.isRunning = false;
            throw error;
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRunning || !this.process) {
            return;
        }

        return new Promise<void>((resolve) => {
            this.process?.kill();
            this.process?.on("exit", () => {
                this.isRunning = false;
                this.process = null;
                resolve();
            });
        });
    }

    public async sendCommand(command: string, data: any[]) {
        if (!this.isRunning || !this.process?.stdin || !this.process?.stdout) {
            throw new Error("Process is not running or stdio not available");
        }

        const message = JSON.stringify([command, ...data]);
        this.process?.stdin?.write(message + "\n");
    }

    public isProcessRunning(): boolean {
        return this.isRunning;
    }
}

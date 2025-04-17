import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';

export class TexpressoProcessManager extends EventEmitter {
    private process: ChildProcess | null = null;
    private isRunning: boolean = false;

    constructor(private executablePath: string = 'texpresso') {
        super();
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Texpresso process is already running');
        }

        try {
            this.process = spawn(this.executablePath, [], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.isRunning = true;

            // Handle process events
            this.process.stdout?.on('data', (data: Buffer) => {
                this.emit('stdout', data.toString());
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                this.emit('stderr', data.toString());
            });

            this.process.on('error', (error: Error) => {
                this.emit('error', error);
            });

            this.process.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
                this.isRunning = false;
                this.emit('exit', { code, signal });
            });

            // Wait for process to start
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Process start timeout'));
                }, 5000);

                const stdout = this.process?.stdout;
                if (!stdout) {
                    clearTimeout(timeout);
                    reject(new Error('Process stdout not available'));
                    return;
                }

                stdout.on('data', () => {
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
            this.process?.on('exit', () => {
                this.isRunning = false;
                this.process = null;
                resolve();
            });
        });
    }

    public async sendCommand(command: string): Promise<string> {
        if (!this.isRunning || !this.process?.stdin || !this.process?.stdout) {
            throw new Error('Process is not running or stdio not available');
        }

        return new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Command timeout'));
            }, 5000);

            let response = '';

            const dataHandler = (data: Buffer) => {
                response += data.toString();
                if (response.includes('\n')) {
                    clearTimeout(timeout);
                    this.process?.stdout?.removeListener('data', dataHandler);
                    resolve(response.trim());
                }
            };

            this.process?.stdout?.on('data', dataHandler);
            this.process?.stdin?.write(command + '\n');
        });
    }

    public isProcessRunning(): boolean {
        return this.isRunning;
    }
} 
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface ServiceProcess {
  process: ChildProcess | null;
  port: number;
  name: string;
  healthEndpoint: string;
}

class ServiceManager {
  private static instance: ServiceManager;
  private services: Map<string, ServiceProcess> = new Map();
  private isStarting = false;

  private constructor() {}

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async startAllServices(): Promise<void> {
    if (this.isStarting) {
      console.log('⏳ Services are already starting...');
      return;
    }

    this.isStarting = true;
    console.log('🚀 Starting AMD services...');

    try {
      await this.startPythonService();
      
      console.log('✅ All AMD services started successfully!');
    } catch (error) {
      console.error('❌ Failed to start some services:', error);
    } finally {
      this.isStarting = false;
    }
  }

  private async startPythonService(): Promise<void> {
    const serviceName = 'python-huggingface';
    const port = 8000;
    const healthEndpoint = `http://localhost:${port}/health`;

    if (await this.isServiceHealthy(healthEndpoint)) {
      console.log('✅ Python HuggingFace service is already running');
      return;
    }

    console.log('🐍 Starting Python HuggingFace service...');

    try {
        const success = await this.tryStartPythonService(serviceName, port, healthEndpoint);
      
      if (success) {
        console.log('✅ Python HuggingFace service started successfully');
      } else {
        console.log('⚠️ Python service failed to start, will use fallback mode');
      }
    } catch (error) {
      console.log('⚠️ Python service startup error, will use fallback mode:', error);
    }
  }

  private async tryStartPythonService(serviceName: string, port: number, healthEndpoint: string): Promise<boolean> {
    const pythonServicePath = path.join(process.cwd(), 'python-service');
    
    try {
      console.log('📦 Trying direct Python startup...');
      
      const pythonProcess = spawn('python', ['app.py'], {
        cwd: pythonServicePath,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      this.services.set(serviceName, {
        process: pythonProcess,
        port,
        name: serviceName,
        healthEndpoint,
      });

      pythonProcess.stdout?.on('data', (data) => {
        console.log(`🐍 Python service: ${data.toString().trim()}`);
      });

      pythonProcess.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (!message.includes('WARNING') && !message.includes('INFO')) {
          console.error(`🐍 Python service error: ${message}`);
        }
      });

      pythonProcess.on('error', (error) => {
        console.error(`🐍 Python process error: ${error.message}`);
      });

      pythonProcess.on('exit', (code) => {
        console.log(`🐍 Python service exited with code: ${code}`);
        this.services.delete(serviceName);
      });

      await this.waitForService(healthEndpoint, 30000);
      return true;

    } catch (error) {
      console.log('Direct Python startup failed, trying alternatives...');
    }

    try {
      console.log('📦 Trying python3 startup...');
      
      const pythonProcess = spawn('python3', ['app.py'], {
        cwd: pythonServicePath,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      this.services.set(serviceName, {
        process: pythonProcess,
        port,
        name: serviceName,
        healthEndpoint,
      });

      pythonProcess.stdout?.on('data', (data) => {
        console.log(`🐍 Python service: ${data.toString().trim()}`);
      });

      pythonProcess.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (!message.includes('WARNING') && !message.includes('INFO')) {
          console.error(`🐍 Python service error: ${message}`);
        }
      });

      await this.waitForService(healthEndpoint, 30000);
      return true;

    } catch (error) {
      console.log('python3 startup failed, trying Docker...');
    }

    try {
      console.log('🐳 Trying Docker startup...');
      
      try {
        await execAsync('docker stop amd-python-service 2>/dev/null || true');
        await execAsync('docker rm amd-python-service 2>/dev/null || true');
      } catch (error) {
      }

      await execAsync('docker build -t amd-python-service .', { 
        cwd: pythonServicePath,
        timeout: 120000 
      });
      
      const dockerProcess = spawn('docker', [
        'run', '--rm', '--name', 'amd-python-service',
        '-p', `${port}:8000`,
        '-e', 'HF_MODEL_PATH=jakeBland/wav2vec-vm-finetune',
        '-e', 'HF_CACHE_DIR=/app/models',
        'amd-python-service'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      this.services.set(serviceName, {
        process: dockerProcess,
        port,
        name: serviceName,
        healthEndpoint,
      });

      dockerProcess.stdout?.on('data', (data) => {
        console.log(`🐳 Docker service: ${data.toString().trim()}`);
      });

      dockerProcess.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (!message.includes('WARNING') && !message.includes('INFO')) {
          console.error(`🐳 Docker service error: ${message}`);
        }
      });

      await this.waitForService(healthEndpoint, 60000);
      return true;

    } catch (error) {
      console.log('Docker startup failed:', error);
    }

    return false;
  }

  private async isServiceHealthy(healthEndpoint: string): Promise<boolean> {
    try {
      const response = await fetch(healthEndpoint, { 
        signal: AbortSignal.timeout(3000) 
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async waitForService(healthEndpoint: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 2000;
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.isServiceHealthy(healthEndpoint)) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`Service did not become healthy within ${timeoutMs}ms`);
  }

  async stopAllServices(): Promise<void> {
    console.log('🛑 Stopping AMD services...');
    
    for (const [name, service] of this.services) {
      try {
        if (service.process && !service.process.killed) {
          console.log(`🛑 Stopping ${name}...`);
          service.process.kill('SIGTERM');
          
          setTimeout(() => {
            if (service.process && !service.process.killed) {
              service.process.kill('SIGKILL');
            }
          }, 5000);
        }
      } catch (error) {
        console.error(`Failed to stop ${name}:`, error);
      }
    }
    
    this.services.clear();
    console.log('✅ All services stopped');
  }

  getServiceStatus(): Record<string, { running: boolean; port: number; name: string }> {
    const status: Record<string, { running: boolean; port: number; name: string }> = {};
    
    for (const [name, service] of this.services) {
      status[name] = {
        running: service.process !== null && !service.process.killed,
        port: service.port,
        name: service.name,
      };
    }
    
    return status;
  }
}

export const serviceManager = ServiceManager.getInstance();

if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    serviceManager.startAllServices().catch(console.error);
  }, 2000);
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down services...');
  await serviceManager.stopAllServices();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down services...');
  await serviceManager.stopAllServices();
  process.exit(0);
});

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PythonServiceManager {
  private static instance: PythonServiceManager;
  private serviceUrl: string;
  private isStarting: boolean = false;

  private constructor() {
    this.serviceUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
  }

  public static getInstance(): PythonServiceManager {
    if (!PythonServiceManager.instance) {
      PythonServiceManager.instance = new PythonServiceManager();
    }
    return PythonServiceManager.instance;
  }

  async ensureServiceRunning(): Promise<string | null> {
    try {
      if (await this.isServiceHealthy()) {
        console.log("✅ Python ML service is already running");
        return this.serviceUrl;
      }

      if (this.isStarting) {
        console.log("⏳ Python ML service is already starting...");
        await this.waitForService(30000);
        return await this.isServiceHealthy() ? this.serviceUrl : null;
      }

      console.log("🚀 Starting Python ML service...");
      this.isStarting = true;

      try {
        await this.startService();
        await this.waitForService(60000);
        
        if (await this.isServiceHealthy()) {
          console.log("✅ Python ML service started successfully");
          return this.serviceUrl;
        } else {
          console.log("❌ Python ML service failed to start properly");
          return null;
        }
      } finally {
        this.isStarting = false;
      }

    } catch (error) {
      console.error("Failed to ensure Python service is running:", error);
      this.isStarting = false;
      return null;
    }
  }

  private async isServiceHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`, { 
        signal: AbortSignal.timeout(3000) 
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async startService(): Promise<void> {
    try {
      
      if (await this.tryDockerCompose()) {
        return;
      }

      if (await this.tryDirectDocker()) {
        return;
      }

      if (await this.trySetupScript()) {
        return;
      }

      throw new Error("All startup methods failed");

    } catch (error) {
      console.error("Service startup failed:", error);
      throw error;
    }
  }

  private async tryDockerCompose(): Promise<boolean> {
    try {
      console.log("📦 Trying Docker Compose startup...");
      
      await execAsync('docker-compose --version');
      
      const { stdout, stderr } = await execAsync('docker-compose up python-service -d', {
        cwd: process.cwd(),
        timeout: 30000,
      });
      
      console.log("Docker Compose output:", stdout);
      if (stderr) console.log("Docker Compose stderr:", stderr);
      
      return true;
    } catch (error) {
      console.log("Docker Compose startup failed:", error);
      return false;
    }
  }

  private async tryDirectDocker(): Promise<boolean> {
    try {
      console.log("🐳 Trying direct Docker startup...");
      
      await execAsync('docker --version');
      
      const buildCmd = 'docker build -t amd-python-service ./python-service';
      const runCmd = `docker run -d --name amd-python-service -p 8000:8000 \
        -e HF_MODEL_PATH=jakeBland/wav2vec-vm-finetune \
        -e HF_CACHE_DIR=/app/models \
        -e ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001 \
        amd-python-service`;

      try {
        await execAsync('docker stop amd-python-service');
        await execAsync('docker rm amd-python-service');
      } catch (error) {
      }

      console.log("Building Docker image...");
      await execAsync(buildCmd, { timeout: 120000 });
      
      console.log("Starting Docker container...");
      await execAsync(runCmd, { timeout: 30000 });
      
      return true;
    } catch (error) {
      console.log("Direct Docker startup failed:", error);
      return false;
    }
  }

  private async trySetupScript(): Promise<boolean> {
    try {
      console.log("📜 Trying setup script startup...");
      
      const fs = await import('fs');
      const path = await import('path');
      
      const scriptPath = path.join(process.cwd(), 'scripts', 'setup-python-service.sh');
      
      if (!fs.existsSync(scriptPath)) {
        console.log("Setup script not found");
        return false;
      }

      await execAsync(`chmod +x "${scriptPath}"`);
      const { stdout, stderr } = await execAsync(`"${scriptPath}"`, {
        timeout: 120000,
      });
      
      console.log("Setup script output:", stdout);
      if (stderr) console.log("Setup script stderr:", stderr);
      
      return true;
    } catch (error) {
      console.log("Setup script startup failed:", error);
      return false;
    }
  }

  private async waitForService(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 2000;
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.isServiceHealthy()) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`Service did not become healthy within ${timeoutMs}ms`);
  }

  async stopService(): Promise<void> {
    try {
      console.log("🛑 Stopping Python ML service...");
      
      try {
        await execAsync('docker-compose stop python-service');
      } catch (error) {
        try {
          await execAsync('docker stop amd-python-service');
        } catch (error) {
          console.log("Could not stop service via Docker commands");
        }
      }
      
      console.log("✅ Python ML service stopped");
    } catch (error) {
      console.error("Failed to stop Python service:", error);
    }
  }

  async getServiceStatus(): Promise<{
    running: boolean;
    url: string;
    method?: string;
  }> {
    const running = await this.isServiceHealthy();
    
    return {
      running,
      url: this.serviceUrl,
      method: running ? "auto-detected" : undefined,
    };
  }

  getInstructions(): string {
    return `
🔧 Python ML Service Setup Instructions:

The system will automatically try to start the Python service using:

1. **Docker Compose (Recommended)**:
   \`docker-compose up python-service -d\`

2. **Direct Docker**:
   \`docker build -t amd-python-service ./python-service\`
   \`docker run -d --name amd-python-service -p 8000:8000 amd-python-service\`

3. **Setup Script**:
   \`./scripts/setup-python-service.sh\`

**Manual Setup** (if auto-start fails):
1. Ensure Docker is installed and running
2. Run: \`docker-compose up python-service -d\`
3. Wait for the service to download the HuggingFace model
4. Service will be available at http://localhost:8000

**Model**: jakeBland/wav2vec-vm-finetune
**Endpoints**: 
- GET /health - Health check
- POST /predict - Audio blob analysis
- POST /predict-stream - Streaming analysis
- POST /predict-url - URL-based analysis

The service automatically loads the wav2vec model for real-time AMD analysis.
    `;
  }
}

export const pythonServiceManager = PythonServiceManager.getInstance();

import { serviceManager } from './serviceStartup';

let initialized = false;

export async function initializeServices() {
  if (initialized) {
    return;
  }

  initialized = true;
  
  console.log('🔧 Initializing AMD services...');
  
  try {
    await serviceManager.startAllServices();
    
    console.log('✅ AMD services initialization completed');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    console.log('⚠️ Services will run in fallback mode');
  }
}

if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  initializeServices().catch(console.error);
}

export { serviceManager };

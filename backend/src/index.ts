import { startServer, stopServer } from './server';

// Handle server shutdown gracefully
process.on('SIGINT', stopServer);

// Start the server
startServer().catch(console.error);

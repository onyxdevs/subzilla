/**
 * Jest Setup File for Mac Tests
 * Sets environment variables before tests run
 */

// Set NODE_ENV to test to prevent auto-instantiation of SubzillaApp
process.env.NODE_ENV = 'test';

// Disable security warnings in tests
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

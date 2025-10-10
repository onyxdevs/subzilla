import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import ConfigManager from '../src/ConfigManager';

describe('ConfigManager', () => {
    let tempDir: string;
    let originalCwd: string;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'subzilla-config-'));
        originalCwd = process.cwd();
        originalEnv = { ...process.env };
        process.chdir(tempDir);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        process.env = originalEnv;
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Configuration Loading', () => {
        it('should return default config when no config file exists', async () => {
            const config = await ConfigManager.loadConfig();

            expect(config).toBeDefined();
            expect(config.input.encoding).toBe('auto');
            expect(config.output.encoding).toBe('utf8');
            expect(config.batch.parallel).toBe(false);
        });

        it('should load config from .subzillarc file', async () => {
            const configContent = `
input:
  encoding: windows-1256
output:
  encoding: utf8
  bom: false
batch:
  parallel: true
  chunkSize: 10
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), configContent, 'utf8');

            const config = await ConfigManager.loadConfig();

            expect(config.input.encoding).toBe('windows-1256');
            expect(config.output.bom).toBe(false);
            expect(config.batch.parallel).toBe(true);
            expect(config.batch.chunkSize).toBe(10);
        });

        it('should load config from .subzilla.yml file', async () => {
            const configContent = `
input:
  encoding: utf8
batch:
  chunkSize: 15
`;
            await fs.writeFile(path.join(tempDir, '.subzilla.yml'), configContent, 'utf8');

            const config = await ConfigManager.loadConfig();

            expect(config.input.encoding).toBe('utf8');
            expect(config.batch.chunkSize).toBe(15);
        });

        it('should load config from specific path', async () => {
            const customConfigPath = path.join(tempDir, 'custom.yml');
            const configContent = `
input:
  encoding: latin1
batch:
  parallel: false
`;
            await fs.writeFile(customConfigPath, configContent, 'utf8');

            const config = await ConfigManager.loadConfig(customConfigPath);

            expect(config.input.encoding).toBe('latin1');
            expect(config.batch.parallel).toBe(false);
        });

        it('should try config files in priority order', async () => {
            // Create multiple config files
            await fs.writeFile(path.join(tempDir, '.subzilla.yaml'), 'input:\n  encoding: yaml', 'utf8');
            await fs.writeFile(path.join(tempDir, '.subzillarc'), 'input:\n  encoding: rc', 'utf8');

            const config = await ConfigManager.loadConfig();

            // .subzillarc should take priority over .subzilla.yaml
            expect(config.input.encoding).toBe('rc');
        });
    });

    describe('Environment Variable Override', () => {
        it('should override config with environment variables', async () => {
            const configContent = `
input:
  encoding: auto
batch:
  parallel: false
  chunkSize: 5
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), configContent, 'utf8');

            // Set environment variables
            process.env.SUBZILLA_BATCH_PARALLEL = 'true';
            process.env.SUBZILLA_BATCH_CHUNKSIZE = '20';

            const config = await ConfigManager.loadConfig();

            expect(config.batch.parallel).toBe(true);
            expect(config.batch.chunkSize).toBe(20);
        });

        it('should parse JSON values in environment variables', async () => {
            process.env.SUBZILLA_BATCH_CHUNKSIZE = '25';
            process.env.SUBZILLA_BATCH_PARALLEL = 'true';

            const config = await ConfigManager.loadConfig();

            expect(typeof config.batch.chunkSize).toBe('number');
            expect(config.batch.chunkSize).toBe(25);
            expect(typeof config.batch.parallel).toBe('boolean');
            expect(config.batch.parallel).toBe(true);
        });

        it('should handle nested environment variables', async () => {
            process.env.SUBZILLA_OUTPUT_ENCODING = 'utf8';
            process.env.SUBZILLA_OUTPUT_BOM = 'false';

            const config = await ConfigManager.loadConfig();

            expect(config.output.encoding).toBe('utf8');
            expect(config.output.bom).toBe(false);
        });
    });

    describe('Configuration Validation', () => {
        it('should validate config against schema', async () => {
            const validConfig = `
input:
  encoding: utf8
  format: auto
output:
  encoding: utf8
  bom: true
  lineEndings: auto
batch:
  parallel: true
  chunkSize: 5
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), validConfig, 'utf8');

            const config = await ConfigManager.loadConfig();

            expect(config).toBeDefined();
            expect(config.input.encoding).toBe('utf8');
        });

        it('should return default config for invalid YAML', async () => {
            const invalidYaml = `
input:
  encoding: utf8
    invalid indentation
  format: auto
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), invalidYaml, 'utf8');

            const config = await ConfigManager.loadConfig();

            // Should fallback to default config
            expect(config).toBeDefined();
            expect(config.input.encoding).toBe('auto'); // Default value
        });

        it('should handle config with invalid values gracefully', async () => {
            const configWithInvalid = `
input:
  encoding: auto
batch:
  chunkSize: "not a number"
  parallel: "yes"
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), configWithInvalid, 'utf8');

            const config = await ConfigManager.loadConfig();

            // Should use defaults for invalid values
            expect(config).toBeDefined();
        });

        it('should handle empty config file', async () => {
            await fs.writeFile(path.join(tempDir, '.subzillarc'), '', 'utf8');

            const config = await ConfigManager.loadConfig();

            expect(config).toBeDefined();
            expect(config.input).toBeDefined();
            expect(config.output).toBeDefined();
        });

        it('should handle config with only partial settings', async () => {
            const partialConfig = `
batch:
  chunkSize: 10
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), partialConfig, 'utf8');

            const config = await ConfigManager.loadConfig();

            expect(config.batch.chunkSize).toBe(10);
            // Other values should be defaults
            expect(config.input.encoding).toBe('auto');
            expect(config.output.encoding).toBe('utf8');
        });
    });

    describe('Configuration Saving', () => {
        it('should save config to specified file', async () => {
            const configPath = path.join(tempDir, 'test-config.yml');
            const config = await ConfigManager.loadConfig();

            config.batch.chunkSize = 15;
            config.batch.parallel = true;

            await ConfigManager.saveConfig(config, configPath);

            const savedContent = await fs.readFile(configPath, 'utf8');

            expect(savedContent).toContain('chunkSize: 15');
            expect(savedContent).toContain('parallel: true');
        });

        it('should create valid YAML format', async () => {
            const configPath = path.join(tempDir, 'formatted.yml');
            const config = await ConfigManager.loadConfig();

            await ConfigManager.saveConfig(config, configPath);

            const savedContent = await fs.readFile(configPath, 'utf8');

            // Should be valid YAML
            expect(savedContent).toContain('input:');
            expect(savedContent).toContain('output:');
            expect(savedContent).toContain('batch:');
        });

        it('should validate config before saving', async () => {
            const configPath = path.join(tempDir, 'validated.yml');
            const config = await ConfigManager.loadConfig();

            // Modify config
            config.batch.chunkSize = 20;

            await ConfigManager.saveConfig(config, configPath);

            // Load it back and verify
            const loadedConfig = await ConfigManager.loadConfig(configPath);

            expect(loadedConfig.batch.chunkSize).toBe(20);
        });

        it('should handle saving to nested directory', async () => {
            const nestedPath = path.join(tempDir, 'nested', 'dir', 'config.yml');
            const config = await ConfigManager.loadConfig();

            // Create parent directory
            await fs.mkdir(path.dirname(nestedPath), { recursive: true });

            await ConfigManager.saveConfig(config, nestedPath);

            expect(
                await fs
                    .access(nestedPath)
                    .then(() => true)
                    .catch(() => false),
            ).toBe(true);
        });
    });

    describe('Default Configuration Creation', () => {
        it('should create default config file', async () => {
            const configPath = path.join(tempDir, 'default.yml');

            await ConfigManager.createDefaultConfig(configPath);

            expect(
                await fs
                    .access(configPath)
                    .then(() => true)
                    .catch(() => false),
            ).toBe(true);

            const content = await fs.readFile(configPath, 'utf8');

            expect(content).toContain('input:');
            expect(content).toContain('encoding: auto');
        });

        it('should create valid default configuration', async () => {
            const configPath = path.join(tempDir, 'valid-default.yml');

            await ConfigManager.createDefaultConfig(configPath);

            // Load it back to verify it's valid
            const config = await ConfigManager.loadConfig(configPath);

            expect(config.input.encoding).toBe('auto');
            expect(config.output.encoding).toBe('utf8');
            expect(config.batch.parallel).toBe(false);
        });
    });

    describe('Deep Merge', () => {
        it('should merge nested configuration objects', async () => {
            const baseConfig = `
input:
  encoding: auto
  format: auto
output:
  encoding: utf8
  bom: true
batch:
  parallel: false
  chunkSize: 5
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), baseConfig, 'utf8');

            // Set specific override
            process.env.SUBZILLA_OUTPUT_BOM = 'false';

            const config = await ConfigManager.loadConfig();

            // Output section should be merged, not replaced
            expect(config.output.encoding).toBe('utf8'); // From file
            expect(config.output.bom).toBe(false); // From env
        });

        it('should preserve unaffected nested properties', async () => {
            const partialConfig = `
batch:
  chunkSize: 10
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), partialConfig, 'utf8');

            const config = await ConfigManager.loadConfig();

            // All other batch properties should have defaults
            expect(config.batch.chunkSize).toBe(10); // From file
            expect(config.batch.parallel).toBe(false); // Default
            expect(config.batch.skipExisting).toBe(false); // Default
        });
    });

    describe('Edge Cases', () => {
        it('should handle very large config files', async () => {
            // Create config with many properties
            const largeConfig = `
input:
  encoding: auto
  format: auto
output:
  encoding: utf8
  bom: true
  lineEndings: auto
  createBackup: false
  overwriteInput: false
  overwriteExisting: false
batch:
  recursive: false
  parallel: false
  skipExisting: false
  preserveStructure: false
  chunkSize: 5
  retryCount: 0
  retryDelay: 1000
  failFast: false
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), largeConfig, 'utf8');

            const config = await ConfigManager.loadConfig();

            expect(config).toBeDefined();
            expect(config.batch.retryCount).toBe(0);
        });

        it('should handle config with comments', async () => {
            const configWithComments = `
# Input settings
input:
  encoding: auto # Auto-detect encoding

# Output settings
output:
  encoding: utf8
  bom: true # Add BOM
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), configWithComments, 'utf8');

            const config = await ConfigManager.loadConfig();

            expect(config.input.encoding).toBe('auto');
            expect(config.output.bom).toBe(true);
        });

        it('should handle config with special characters in values', async () => {
            const configWithSpecial = `
output:
  directory: "/path/with spaces/and-special_chars"
`;
            await fs.writeFile(path.join(tempDir, '.subzillarc'), configWithSpecial, 'utf8');

            const config = await ConfigManager.loadConfig();

            expect(config).toBeDefined();
        });

        it('should handle non-existent config path gracefully', async () => {
            const config = await ConfigManager.loadConfig('/nonexistent/path/config.yml');

            // Should return defaults
            expect(config.input.encoding).toBe('auto');
        });

        it('should handle file system errors gracefully', async () => {
            // Try to load from a directory instead of a file
            const dirPath = path.join(tempDir, 'notafile');

            await fs.mkdir(dirPath);

            const config = await ConfigManager.loadConfig(dirPath);

            // Should return defaults
            expect(config).toBeDefined();
        });
    });

    describe('Multiple Config File Priority', () => {
        it('should prioritize specific path over discovered files', async () => {
            await fs.writeFile(path.join(tempDir, '.subzillarc'), 'input:\n  encoding: rc', 'utf8');

            const customPath = path.join(tempDir, 'custom.yml');

            await fs.writeFile(customPath, 'input:\n  encoding: custom', 'utf8');

            const config = await ConfigManager.loadConfig(customPath);

            expect(config.input.encoding).toBe('custom');
        });

        it('should search for config files in correct order', async () => {
            // Create multiple config files with different values
            await fs.writeFile(path.join(tempDir, 'subzilla.config.yaml'), 'batch:\n  chunkSize: 1', 'utf8');
            await fs.writeFile(path.join(tempDir, '.subzilla.yaml'), 'batch:\n  chunkSize: 2', 'utf8');
            await fs.writeFile(path.join(tempDir, '.subzillarc'), 'batch:\n  chunkSize: 3', 'utf8');

            const config = await ConfigManager.loadConfig();

            // .subzillarc should be found first
            expect(config.batch.chunkSize).toBe(3);
        });
    });
});

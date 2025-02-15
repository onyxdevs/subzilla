import { z } from 'zod';
import { configSchema } from '../validation';

/**
 * Type for config schema validation
 */
export type TConfigSchema = z.infer<typeof configSchema>;

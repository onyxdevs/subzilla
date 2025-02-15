import { IStripOptions } from '../../types/common/options';
import { IStripCommandOptions } from '../../types/cli/options';
import { ISubtitleConfig } from '../../types/core/config';

export function createStripOptions(
    options: IStripCommandOptions,
    config: ISubtitleConfig
): IStripOptions | undefined {
    const stripOptions: IStripOptions = options.stripAll
        ? {
              html: true,
              colors: true,
              styles: true,
              urls: true,
              timestamps: true,
              numbers: true,
              punctuation: true,
              emojis: true,
              brackets: true,
          }
        : {
              html: options.stripHtml || config.strip?.html || false,
              colors: options.stripColors || config.strip?.colors || false,
              styles: options.stripStyles || config.strip?.styles || false,
              urls: options.stripUrls || config.strip?.urls || false,
              timestamps: options.stripTimestamps || config.strip?.timestamps || false,
              numbers: options.stripNumbers || config.strip?.numbers || false,
              punctuation: options.stripPunctuation || config.strip?.punctuation || false,
              emojis: options.stripEmojis || config.strip?.emojis || false,
              brackets: options.stripBrackets || config.strip?.brackets || false,
          };

    return Object.values(stripOptions).some(v => v) ? stripOptions : undefined;
}

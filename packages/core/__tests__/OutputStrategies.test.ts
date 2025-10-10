import path from 'path';

import { describe, it, expect } from '@jest/globals';

import OverwriteOutputStrategy from '../src/utils/OverwriteOutputStrategy';
import SuffixOutputStrategy from '../src/utils/SuffixOutputStrategy';

describe('Output Strategies', () => {
    describe('SuffixOutputStrategy', () => {
        let strategy: SuffixOutputStrategy;

        beforeEach(() => {
            strategy = new SuffixOutputStrategy();
        });

        describe('getOutputPath', () => {
            it('should add .subzilla suffix to filename', () => {
                const inputPath = '/path/to/movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie.subzilla.srt');
            });

            it('should handle files with multiple dots', () => {
                const inputPath = '/path/to/movie.en.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie.en.subzilla.srt');
            });

            it('should handle files without extension', () => {
                const inputPath = '/path/to/subtitle';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/subtitle.subzilla');
            });

            it('should preserve directory structure', () => {
                const inputPath = '/very/deep/nested/path/to/subtitle.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/very/deep/nested/path/to/subtitle.subzilla.srt');
                expect(path.dirname(outputPath)).toBe(path.dirname(inputPath));
            });

            it('should handle relative paths', () => {
                const inputPath = 'relative/path/movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('relative/path/movie.subzilla.srt');
            });

            it('should handle current directory paths', () => {
                const inputPath = './movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('./movie.subzilla.srt');
            });

            it('should handle parent directory paths', () => {
                const inputPath = '../movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('../movie.subzilla.srt');
            });

            it('should handle very long filenames', () => {
                const longName = 'A'.repeat(200);
                const inputPath = `/path/to/${longName}.srt`;
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe(`/path/to/${longName}.subzilla.srt`);
            });

            it('should handle special characters in filename', () => {
                const inputPath = '/path/to/movie [2024] (HD) #1.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie [2024] (HD) #1.subzilla.srt');
            });

            it('should handle Unicode characters in filename', () => {
                const inputPath = '/path/to/电影.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/电影.subzilla.srt');
            });

            it('should handle emoji in filename', () => {
                const inputPath = '/path/to/movie😊.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie😊.subzilla.srt');
            });

            it('should handle spaces in filename', () => {
                const inputPath = '/path/to/My Movie Title.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/My Movie Title.subzilla.srt');
            });

            it('should handle file with .subzilla already in name', () => {
                const inputPath = '/path/to/movie.subzilla.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie.subzilla.subzilla.srt');
            });
        });

        describe('Edge Cases', () => {
            it('should handle empty string', () => {
                const inputPath = '';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('.subzilla');
            });

            it('should handle just a filename', () => {
                const inputPath = 'movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('movie.subzilla.srt');
            });

            it('should handle hidden files', () => {
                const inputPath = '/path/to/.hidden.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/.hidden.subzilla.srt');
            });

            it('should handle multiple consecutive dots', () => {
                const inputPath = '/path/to/movie...srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie..subzilla.srt');
            });

            it('should handle filename ending with dot', () => {
                const inputPath = '/path/to/movie.';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie.subzilla.');
            });

            it('should handle Windows-style paths', () => {
                const inputPath = 'C:\\Users\\Documents\\movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toContain('movie.subzilla.srt');
            });

            it('should handle mixed path separators', () => {
                const inputPath = '/path/to\\mixed/separators\\movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toContain('movie.subzilla.srt');
            });
        });

        describe('Different File Extensions', () => {
            it('should handle .sub extension', () => {
                const inputPath = '/path/to/movie.sub';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie.subzilla.sub');
            });

            it('should handle .ass extension', () => {
                const inputPath = '/path/to/movie.ass';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie.subzilla.ass');
            });

            it('should handle .ssa extension', () => {
                const inputPath = '/path/to/movie.ssa';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie.subzilla.ssa');
            });

            it('should handle .txt extension', () => {
                const inputPath = '/path/to/subtitles.txt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/subtitles.subzilla.txt');
            });

            it('should handle uppercase extensions', () => {
                const inputPath = '/path/to/movie.SRT';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('/path/to/movie.subzilla.SRT');
            });
        });
    });

    describe('OverwriteOutputStrategy', () => {
        let strategy: OverwriteOutputStrategy;

        beforeEach(() => {
            strategy = new OverwriteOutputStrategy();
        });

        describe('getOutputPath', () => {
            it('should return same path as input', () => {
                const inputPath = '/path/to/movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe(inputPath);
            });

            it('should handle files with multiple dots', () => {
                const inputPath = '/path/to/movie.en.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe(inputPath);
            });

            it('should handle files without extension', () => {
                const inputPath = '/path/to/subtitle';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe(inputPath);
            });

            it('should preserve all special characters', () => {
                const inputPath = '/path/to/movie [2024] (HD) #1 - special.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe(inputPath);
            });

            it('should preserve Unicode characters', () => {
                const inputPath = '/path/to/电影 فيلم.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe(inputPath);
            });

            it('should handle very long paths', () => {
                const longPath = '/path/' + 'a/'.repeat(100) + 'movie.srt';
                const outputPath = strategy.getOutputPath(longPath);

                expect(outputPath).toBe(longPath);
            });

            it('should handle empty string', () => {
                const inputPath = '';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe('');
            });

            it('should handle relative paths', () => {
                const inputPath = './relative/path/movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe(inputPath);
            });

            it('should handle parent directory references', () => {
                const inputPath = '../../parent/movie.srt';
                const outputPath = strategy.getOutputPath(inputPath);

                expect(outputPath).toBe(inputPath);
            });
        });

        describe('Comparison with SuffixStrategy', () => {
            it('should behave differently from SuffixOutputStrategy', () => {
                const inputPath = '/path/to/movie.srt';
                const overwriteStrategy = new OverwriteOutputStrategy();
                const suffixStrategy = new SuffixOutputStrategy();

                const overwritePath = overwriteStrategy.getOutputPath(inputPath);
                const suffixPath = suffixStrategy.getOutputPath(inputPath);

                expect(overwritePath).toBe(inputPath);
                expect(suffixPath).toBe('/path/to/movie.subzilla.srt');
                expect(overwritePath).not.toBe(suffixPath);
            });
        });
    });

    describe('Strategy Pattern Usage', () => {
        it('should allow switching between strategies', () => {
            const inputPath = '/path/to/movie.srt';
            let strategy: SuffixOutputStrategy | OverwriteOutputStrategy;

            // Use suffix strategy
            strategy = new SuffixOutputStrategy();

            let outputPath = strategy.getOutputPath(inputPath);

            expect(outputPath).toBe('/path/to/movie.subzilla.srt');

            // Switch to overwrite strategy
            strategy = new OverwriteOutputStrategy();
            outputPath = strategy.getOutputPath(inputPath);

            expect(outputPath).toBe(inputPath);
        });

        it('should maintain consistent interface across strategies', () => {
            const inputPath = '/path/to/movie.srt';
            const strategies = [new SuffixOutputStrategy(), new OverwriteOutputStrategy()];

            strategies.forEach((strategy) => {
                const outputPath = strategy.getOutputPath(inputPath);

                expect(typeof outputPath).toBe('string');
                expect(outputPath.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Path Normalization', () => {
        it('should handle paths with trailing slashes (SuffixStrategy)', () => {
            const strategy = new SuffixOutputStrategy();
            const inputPath = '/path/to/movie.srt/';
            const outputPath = strategy.getOutputPath(inputPath);

            expect(outputPath).toBeDefined();
        });

        it('should handle paths with backslashes (Windows)', () => {
            const strategy = new SuffixOutputStrategy();
            const inputPath = 'C:\\Users\\Documents\\movie.srt';
            const outputPath = strategy.getOutputPath(inputPath);

            expect(outputPath).toContain('movie.subzilla');
        });

        it('should handle UNC paths (Windows network paths)', () => {
            const strategy = new SuffixOutputStrategy();
            const inputPath = '\\\\network\\share\\movie.srt';
            const outputPath = strategy.getOutputPath(inputPath);

            expect(outputPath).toContain('movie.subzilla.srt');
        });
    });
});

import { IOutputStrategy } from '@subzilla/types';

export default class SuffixOutputStrategy implements IOutputStrategy {
    constructor(private suffix: string = '.subzilla') {
        this.suffix = suffix;
    }

    getOutputPath(inputPath: string): string {
        const dotIndex = inputPath.lastIndexOf('.');

        if (dotIndex === -1) return `${inputPath}${this.suffix}`;

        const baseName = inputPath.substring(0, dotIndex);
        const extension = inputPath.substring(dotIndex);

        return `${baseName}${this.suffix}${extension}`;
    }

    get shouldBackup(): boolean {
        return false; // Backup optional for suffix strategy as we're not overwriting
    }
}

import { IOutputStrategy } from '@subzilla/types/core/utils';

export default class OverwriteOutputStrategy implements IOutputStrategy {
    getOutputPath(inputPath: string): string {
        return inputPath;
    }

    get shouldBackup(): boolean {
        return true; // Always backup when overwriting
    }
}

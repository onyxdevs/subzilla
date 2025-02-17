export interface IOutputStrategy {
    getOutputPath(inputPath: string): string;
    shouldBackup: boolean;
}

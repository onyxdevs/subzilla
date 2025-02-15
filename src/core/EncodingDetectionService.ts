import * as fs from 'fs';
import * as chardet from 'chardet';

export class EncodingDetectionService {
    public static detectEncoding(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
                if (err) {
                    return reject(err);
                }

                const encoding = chardet.detect(data);

                // If chardet returns null, fallback to utf-8
                resolve(encoding || 'utf-8');
            });
        });
    }
}

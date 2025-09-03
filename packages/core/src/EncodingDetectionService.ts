import fs from 'fs';

import { detect } from 'chardet';

export default class EncodingDetectionService {
    public static detectEncoding(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
                if (err) {
                    return reject(err);
                }

                const encoding = detect(data);

                // If chardet returns null, fallback to utf-8
                resolve(encoding || 'utf-8');
            });
        });
    }
}

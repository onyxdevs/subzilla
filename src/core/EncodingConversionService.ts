import * as iconv from 'iconv-lite';

export class EncodingConversionService {
    public static convertToUtf8(content: Buffer, originalEncoding: string): string {
        // Convert from original encoding to a UTF-8 string
        return iconv.decode(content, originalEncoding);
    }
}

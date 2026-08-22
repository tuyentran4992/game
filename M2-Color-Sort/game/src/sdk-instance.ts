// Singleton SDK handler — tách riêng tránh vòng lặp import giữa main.ts và context.ts.
import { SdkHandler } from './sdk-handler';
export const sdk = new SdkHandler();

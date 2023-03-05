import { Novu } from '@novu/node';

const apiKey: string = process.env.NOVU_API_KEY!;

export const novu = new Novu(apiKey);
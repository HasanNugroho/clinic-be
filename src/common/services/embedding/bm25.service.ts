// bm25.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'node_modules/@nestjs/config';

@Injectable()
export class BM25Service {
    private readonly logger = new Logger(BM25Service.name);
    private embedServiceUrl: string

    constructor(
        private configService: ConfigService) {
        this.embedServiceUrl = this.configService.get<string>('EMBED_SERVICE_URL') || 'http://localhost:8001';
    }

    async generateBM25(text: string) {
        try {
            const res = await fetch(this.embedServiceUrl + "/embed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                this.logger.error(
                    `BM25 service error: status=${res.status}, message=${errorText}`,
                );
                throw new Error(`BM25 service error: ${res.status} ${res.statusText}`);
            }

            return res.json();
        } catch (error) {
            this.logger.error(`Failed to generate BM25 embedding: ${error.message}`);
            throw error;
        }
    }
}

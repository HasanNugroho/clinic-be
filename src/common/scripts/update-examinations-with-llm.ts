/**
 * Update Examinations Script
 *
 * Reads sample-examinations.json and updates diagnosisSummary and doctorNotes
 * using LLM-generated content in Indonesian
 *
 * Usage:
 * npx ts-node src/common/scripts/update-examinations-with-llm.ts [--no-llm]
 *
 * Options:
 * --no-llm: Use template-based notes instead of LLM (faster, no API calls)
 */

import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// Load .env file if it exists
dotenv.config();

interface Examination {
    patientEmail: string;
    doctorEmail: string;
    examinationDate: string;
    diagnosisSummary: string;
    doctorNotes: string;
    status: string;
}

interface ExaminationData {
    examinations: Examination[];
}

class ExaminationUpdater {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Map diagnosis to more detailed medical diagnosis
     */
    private mapDiagnosis(diagnosisSummary: string): string {
        const diagnosisMap: Record<string, string> = {
            'Hypertension Stage 1': 'Hipertensi Esensial Stadium 1',
            'Arrhythmia': 'Aritmia Jantung',
            'Migraine Headache': 'Migren dengan Aura',
            'Fever - Upper Respiratory Infection': 'Infeksi Saluran Pernapasan Atas dengan Demam',
            'Chest Pain - Musculoskeletal': 'Nyeri Dada Muskuloskeletal',
            'Tension Headache': 'Sakit Kepala Tegang',
            'Allergic Rhinitis': 'Rinitis Alergi',
            'Dizziness - Benign Positional Vertigo': 'Vertigo Posisional Paroksismal Jinak',
        };

        return diagnosisMap[diagnosisSummary] || diagnosisSummary;
    }

    /**
     * Create prompt for LLM to generate Indonesian doctor notes
     */
    private createPrompt(examination: Examination, mappedDiagnosis: string): string {
        return `Anda adalah seorang dokter berpengalaman. Buatlah catatan medis profesional dan informatif dalam bahasa Indonesia berdasarkan informasi pemeriksaan berikut.

INFORMASI PEMERIKSAAN:
- Diagnosis: ${mappedDiagnosis}
- Tanggal Pemeriksaan: ${new Date(examination.examinationDate).toLocaleDateString('id-ID')}
- Status: ${examination.status}

PERSYARATAN:
1. Tulis 2-3 kalimat catatan medis profesional dalam bahasa Indonesia
2. Sertakan temuan klinis dan observasi
3. Sertakan rekomendasi tindak lanjut atau instruksi pemulangan
4. Gunakan nada medis profesional
5. JANGAN sertakan nama atau email pasien
6. Fokus pada fakta klinis dan observasi medis
7. Gunakan terminologi medis yang tepat dalam bahasa Indonesia

Hasilkan hanya catatan medis, tanpa teks atau penjelasan tambahan.`;
    }

    /**
     * Generate doctor notes using OpenAI LLM
     */
    async generateDoctorNotes(examination: Examination, mappedDiagnosis: string): Promise<string> {
        try {
            const prompt = this.createPrompt(examination, mappedDiagnosis);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 200,
            });

            const content = response.choices[0]?.message?.content || '';
            return content.trim();
        } catch (error) {
            console.error('Error generating doctor notes:', error);
            return this.generateFallbackNotes(examination, mappedDiagnosis);
        }
    }

    /**
     * Generate fallback notes (template-based)
     */
    private generateFallbackNotes(examination: Examination, mappedDiagnosis: string): string {
        const diagnosisLower = mappedDiagnosis.toLowerCase();

        const templates: Record<string, string> = {
            'hipertensi': 'Pasien didiagnosis dengan hipertensi esensial. Tekanan darah elevasi terdeteksi. Direkomendasikan perubahan gaya hidup dan tindak lanjut dalam 2 minggu.',
            'aritmia': 'Pasien menunjukkan aritmia jantung. Detak jantung tidak teratur terdeteksi. Diberikan obat dan dijadwalkan EKG untuk minggu depan.',
            'migren': 'Pasien didiagnosis dengan migren kronis. Gejala migren dengan aura terdeteksi. Diberikan obat preventif dan disarankan menghindari pemicu.',
            'infeksi': 'Pasien mengalami infeksi saluran pernapasan atas dengan demam. Gejala batuk dan demam terdeteksi. Diberikan antibiotik dan disarankan istirahat. Tindak lanjut dalam 3 hari.',
            'nyeri dada': 'Pasien mengalami nyeri dada muskuloskeletal. Nyeri dada bersifat muskuloskeletal. Diberikan obat pereda nyeri dan terapi fisik.',
            'sakit kepala': 'Pasien mengalami sakit kepala tegang. Sakit kepala terkait stres terdeteksi. Direkomendasikan teknik relaksasi dan obat relaksan otot.',
            'rinitis': 'Pasien mengalami rinitis alergi. Alergi musiman menyebabkan kemacetan hidung. Diberikan antihistamin dan semprotan hidung.',
            'vertigo': 'Pasien mengalami vertigo posisional. Pusing dipicu oleh gerakan kepala. Dilakukan manuver Dix-Hallpike dan diberikan latihan vestibular.',
        };

        for (const [key, template] of Object.entries(templates)) {
            if (diagnosisLower.includes(key)) {
                return template;
            }
        }

        return `Pasien didiagnosis dengan ${mappedDiagnosis}. Pemeriksaan klinis dilakukan. Tindak lanjut dijadwalkan sesuai kebutuhan.`;
    }

    /**
     * Update examinations with LLM-generated content
     */
    async updateExaminations(useLLM: boolean = true): Promise<void> {
        try {
            const samplePath = path.join(__dirname, '../import-data/sample-examinations.json');

            console.log(`📖 Reading sample-examinations.json...`);
            const data: ExaminationData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

            console.log(`✅ Loaded ${data.examinations.length} examinations`);
            console.log(`\n🚀 Updating examinations with ${useLLM ? 'LLM' : 'template-based'} content...`);

            for (let i = 0; i < data.examinations.length; i++) {
                const exam = data.examinations[i];
                const mappedDiagnosis = this.mapDiagnosis(exam.diagnosisSummary);

                // Generate doctor notes
                let doctorNotes: string;
                if (useLLM) {
                    doctorNotes = await this.generateDoctorNotes(exam, mappedDiagnosis);
                } else {
                    doctorNotes = this.generateFallbackNotes(exam, mappedDiagnosis);
                }

                // Update examination
                data.examinations[i].diagnosisSummary = mappedDiagnosis;
                data.examinations[i].doctorNotes = doctorNotes;

                // Progress indicator
                const progress = Math.round(((i + 1) / data.examinations.length) * 100);
                process.stdout.write(`\r   Progress: ${progress}% (${i + 1}/${data.examinations.length})`);
            }

            console.log(`\n\n💾 Writing updated examinations to sample-examinations.json...`);
            fs.writeFileSync(samplePath, JSON.stringify(data, null, 4));

            console.log(`\n✅ Update complete!`);
            console.log(`   Total examinations updated: ${data.examinations.length}`);
            console.log(`   File: ${samplePath}`);

            // Show sample
            console.log(`\n📋 Sample examination (updated):`);
            console.log(JSON.stringify(data.examinations[0], null, 2));
        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    let useLLM = true;

    if (args.includes('--no-llm')) {
        useLLM = false;
    }

    if (useLLM && !process.env.OPENAI_API_KEY) {
        console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
        console.error('   Set it with: export OPENAI_API_KEY="sk-..."');
        console.error('   Or use --no-llm flag for template-based notes');
        process.exit(1);
    }

    const updater = new ExaminationUpdater();
    await updater.updateExaminations(useLLM);
}

main();

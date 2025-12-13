import { Injectable } from '@nestjs/common';
import { UserRole } from '../../users/schemas/user.schema';

@Injectable()
export class SnippetBuilderService {
  /**
   * Build snippet based on user role, collection, and data
   * @param role User role (patient, doctor, admin)
   * @param collection Collection name (examinations, registrations, etc)
   * @param data Array of data to format as snippet
   * @returns Formatted snippet string
   */
  buildSnippet(role: UserRole, collection: string, data: any[]): string {
    const builders: Record<UserRole, (c: string, d: any[]) => string> = {
      patient: this.buildPatientSnippet.bind(this),
      doctor: this.buildDoctorSnippet.bind(this),
      admin: this.buildAdminSnippet.bind(this),
    };

    const builder = builders[role];
    return builder(collection, data);
  }

  private buildPatientSnippet(collection: string, data: any[]): string {
    switch (collection) {
      case 'doctorschedules':
        return data
          .map(
            (d) => `
Jadwal Dokter:
- Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
- Hari: ${d.dayOfWeek}
- Waktu: ${d.startTime} - ${d.endTime}
- Kuota: ${d.quota}
`,
          )
          .join('\n');

      case 'examinations':
        return data
          .map(
            (d) => `
Ringkasan Pemeriksaan Anda:
- Tanggal: ${d.examinationDate}
- Status: ${d.status}
- Ringkasan Diagnosis: ${d.diagnosisSummary}
- Catatan Dokter: ${d.doctorNotes}

Informasi ini bersifat edukatif dan bukan pengganti konsultasi langsung dengan dokter.
`,
          )
          .join('\n');

      case 'registrations':
        return data
          .map(
            (d) => `
Pendaftaran:
- Tanggal Pendaftaran: ${d.registrationDate}
- Metode: ${d.registrationMethod}
- Status: ${d.status}
- Nomor Antrian: ${d.queueNumber}
- Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
`,
          )
          .join('\n');

      case 'dashboards':
        return data
          .map(
            (d) => `
Metrik Dashboard Klinik:
- Tanggal: ${d.date}
- Total Pasien: ${d.totalPatients}
- Total Pendaftaran: ${d.totalRegistrations}
- Selesai: ${d.totalCompleted}, Menunggu: ${d.totalWaiting}, Sedang Diperiksa: ${d.totalExamining}, Dibatalkan: ${d.totalCancelled}
- Pendaftaran Online: ${d.registrationMethod?.online ?? 0}, Offline: ${d.registrationMethod?.offline ?? 0}
`,
          )
          .join('\n');

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private buildDoctorSnippet(collection: string, data: any[]): string {
    switch (collection) {
      case 'examinations':
        return data
          .map(
            (d) => `
Data Pemeriksaan (Anonim):
- Tanggal: ${d.examinationDate}
- Status: ${d.status}
- Ringkasan Diagnosis: ${d.diagnosisSummary}
- Catatan Dokter: ${d.doctorNotes}
- Dokter Pemeriksa: ${d.doctor.fullName}

Catatan: Identitas pasien telah dianonimkan sesuai kebijakan privasi.
`,
          )
          .join('\n');

      case 'registrations':
        return data
          .map(
            (d) => `
Pendaftaran (Anonim):
- Tanggal: ${d.registrationDate}
- Status: ${d.status}
- Nomor Antrian: ${d.queueNumber}
- Dokter: ${d.doctor.fullName}
`,
          )
          .join('\n');

      case 'doctorschedules':
        return data
          .map(
            (d) => `
Jadwal Dokter:
- Nama Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
- Hari: ${d.dayOfWeek}
- Waktu: ${d.startTime} - ${d.endTime}
- Kuota: ${d.quota}
`,
          )
          .join('\n');

      case 'dashboards':
        return data
          .map(
            (d) => `
Metrik Dashboard Klinik:
- Tanggal: ${d.date}
- Total Pasien: ${d.totalPatients}
- Total Pendaftaran: ${d.totalRegistrations}
- Selesai: ${d.totalCompleted}, Menunggu: ${d.totalWaiting}, Sedang Diperiksa: ${d.totalExamining}, Dibatalkan: ${d.totalCancelled}
- Pendaftaran Online: ${d.registrationMethod?.online ?? 0}, Offline: ${d.registrationMethod?.offline ?? 0}
`,
          )
          .join('\n');

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private buildAdminSnippet(collection: string, data: any[]): string {
    switch (collection) {
      case 'examinations':
        return data
          .map(
            (d) => `
Data Pemeriksaan (Non-Medis):
- Tanggal: ${JSON.stringify(d.examinationDate)}
- Status: ${d.status}

Catatan: Diagnosis dan catatan dokter disembunyikan sesuai kebijakan.
`,
          )
          .join('\n');

      case 'registrations':
        return data
          .map(
            (d) => `
Pendaftaran:
- Tanggal: ${d.registrationDate}
- Metode: ${d.registrationMethod}
- Status: ${d.status}
- Nomor Antrian: ${d.queueNumber}
- Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
`,
          )
          .join('\n');

      case 'doctorschedules':
        return data
          .map(
            (d) => `
Jadwal Dokter:
- Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
- Hari: ${d.dayOfWeek}
- Waktu: ${d.startTime} - ${d.endTime}
- Kuota: ${d.quota}
`,
          )
          .join('\n');

      case 'dashboards':
        return data
          .map(
            (d) => `
Metrik Dashboard Klinik:
- Tanggal: ${d.date}
- Total Pasien: ${d.totalPatients}
- Total Pendaftaran: ${d.totalRegistrations}
- Selesai: ${d.totalCompleted}, Menunggu: ${d.totalWaiting}, Sedang Diperiksa: ${d.totalExamining}, Dibatalkan: ${d.totalCancelled}
- Pendaftaran Online: ${d.registrationMethod?.online ?? 0}, Offline: ${d.registrationMethod?.offline ?? 0}
`,
          )
          .join('\n');

      default:
        return JSON.stringify(data, null, 2);
    }
  }
}

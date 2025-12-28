import { Injectable } from '@nestjs/common';
import { numberToIndonesianOrdinal } from '../../../common/utils/keyword-number.util';

@Injectable()
export class EmbeddingTextBuilderService {
  /**
   * Build embedding text for dashboard data
   */
  buildDashboardEmbeddingText(dashboard: any): string {
    const dateObj = new Date(dashboard.date);
    const formattedDate = dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const parts: string[] = [];

    parts.push(`Laporan metrik dashboard klinik untuk hari ${formattedDate}.`);

    parts.push(
      `Pada hari tersebut, tercatat total ${dashboard.totalPatients} pasien dengan ` +
        `${dashboard.totalRegistrations} pendaftaran.`,
    );

    parts.push(
      `Dari seluruh pendaftaran, ${dashboard.totalCompleted} telah selesai, ` +
        `${dashboard.totalWaiting} masih menunggu, ${dashboard.totalExamining} sedang dalam pemeriksaan, ` +
        `dan ${dashboard.totalCancelled} dibatalkan.`,
    );

    if (dashboard.registrationMethod) {
      parts.push(
        `Metode pendaftaran terdiri dari ${dashboard.registrationMethod.online} pendaftaran secara online ` +
          `dan ${dashboard.registrationMethod.offline} pendaftaran secara offline.`,
      );
    }

    if (Array.isArray(dashboard.doctorStats) && dashboard.doctorStats.length > 0) {
      const doctorStatsText = dashboard.doctorStats
        .map(
          (stat: any) =>
            `Dr. ${stat.doctorName} menangani ${stat.totalRegistrations} pendaftaran, ` +
            `dengan ${stat.totalCompleted} pemeriksaan telah diselesaikan`,
        )
        .join('. ');

      parts.push(`Statistik berdasarkan dokter menunjukkan bahwa ${doctorStatsText}.`);
    }

    return parts.join('\n\n');
  }

  /**
   * Build embedding text for registration data
   */
  buildRegistrationEmbeddingText(registration: any): string {
    const parts: string[] = [];

    if (registration.registrationDate) {
      const formattedDate = registration.registrationDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      parts.push(`Pendaftaran dilakukan pada tanggal ${formattedDate}.`);
    }

    if (registration.registrationMethod) {
      parts.push(`Metode pendaftaran yang digunakan adalah ${registration.registrationMethod}.`);
    }

    if (registration.status) {
      parts.push(`Status pendaftaran saat ini adalah ${registration.status}.`);
    }

    if (registration.queueNumber) {
      parts.push(`Pasien mendapatkan nomor antrian ${registration.queueNumber}.`);
    }

    const registrationDoctor = registration.doctorId || registration.doctor;
    if (registrationDoctor?.fullName && registrationDoctor?.specialization) {
      parts.push(
        `Pendaftaran ini ditujukan kepada ${registrationDoctor.fullName}, ` +
          `dokter spesialis ${registrationDoctor.specialization}.`,
      );
    } else if (registrationDoctor?.fullName) {
      parts.push(`Pendaftaran ini ditujukan kepada dokter ${registrationDoctor.fullName}.`);
    }

    return parts.join('\n\n');
  }

  /**
   * Build embedding text for examination data
   */
  buildExaminationEmbeddingText(examination: any): string {
    const parts: string[] = [];

    const examinationPatient = examination.patientId || examination.patient;
    if (
      examination.examinationNumber &&
      examination.examinationDate &&
      examinationPatient?.fullName
    ) {
      parts.push(
        `Pemeriksaan medis ${numberToIndonesianOrdinal(examination.examinationNumber)} dilakukan pada tanggal ` +
          `${examination.examinationDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} ` +
          `untuk pasien bernama ${examinationPatient.fullName}.`,
      );
    }

    if (examination.status) {
      parts.push(`Pemeriksaan ini berstatus ${examination.status}.`);
    }

    if (examination.diagnosisSummary) {
      parts.push(`Pasien didiagnosis dengan ${examination.diagnosisSummary}.`);
    }

    if (examination.doctorNotes) {
      parts.push(`Berdasarkan catatan dokter: ${examination.doctorNotes}`);
    }

    const examinationDoctor = examination.doctorId || examination.doctor;
    if (examinationDoctor?.fullName && examinationDoctor?.specialization) {
      parts.push(
        `Pemeriksaan ini ditangani oleh ${examinationDoctor.fullName}, ` +
          `seorang dokter spesialis ${examinationDoctor.specialization}.`,
      );
    }

    return parts.join('\n\n');
  }

  /**
   * Build embedding text for schedule data
   */
  buildScheduleEmbeddingText(schedule: any): string {
    const parts: string[] = [];

    if (schedule.dayOfWeek && schedule.startTime && schedule.endTime) {
      parts.push(
        `Jadwal praktik berlangsung pada hari ${schedule.dayOfWeek}, ` +
          `dari pukul ${schedule.startTime} hingga ${schedule.endTime}.`,
      );
    }

    if (schedule.quota !== undefined) {
      parts.push(`Kuota pasien yang tersedia pada jadwal ini adalah ${schedule.quota} orang.`);
    }

    const scheduleDoctor = schedule.doctorId || schedule.doctor;
    if (scheduleDoctor?.fullName && scheduleDoctor?.specialization) {
      parts.push(
        `Jadwal praktik ini milik ${scheduleDoctor.fullName}, ` +
          `dokter dengan spesialisasi ${scheduleDoctor.specialization}.`,
      );
    } else if (scheduleDoctor?.fullName) {
      parts.push(`Jadwal praktik ini milik dokter ${scheduleDoctor.fullName}.`);
    }

    return parts.join('\n\n');
  }

  /**
   * Build embedding text based on collection type
   */
  buildEmbeddingText(collection: string, doc: any): string {
    switch (collection) {
      case 'dashboards':
        return this.buildDashboardEmbeddingText(doc);
      case 'registrations':
        return this.buildRegistrationEmbeddingText(doc);
      case 'examinations':
        return this.buildExaminationEmbeddingText(doc);
      case 'doctor_schedules':
      case 'doctorschedules':
        return this.buildScheduleEmbeddingText(doc);
      default:
        return JSON.stringify(doc).substring(0, 200);
    }
  }
}

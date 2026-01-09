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
      const methodMap = {
        online: 'online, daftar online, pendaftaran internet, melalui aplikasi',
        offline: 'offline, datang langsung, daftar di tempat, pendaftaran manual',
      };
      const methodText =
        methodMap[registration.registrationMethod] || registration.registrationMethod;
      parts.push(`Metode pendaftaran yang digunakan adalah ${methodText}.`);
    }

    if (registration.status) {
      const statusMap = {
        waiting: 'menunggu, dalam antrian, belum diperiksa, menunggu giliran',
        examining: 'sedang diperiksa, dalam pemeriksaan, sedang berlangsung',
        completed: 'selesai, sudah diperiksa, pemeriksaan tuntas',
        cancelled: 'dibatalkan, tidak jadi diperiksa, batal',
      };
      const statusText = statusMap[registration.status] || registration.status;
      parts.push(`Status pendaftaran saat ini adalah ${statusText}.`);
    }

    if (registration.queueNumber) {
      parts.push(`Pasien mendapatkan nomor antrian ${registration.queueNumber}.`);
    }

    const registrationDoctor = registration.doctorId || registration.doctor;
    if (registrationDoctor?.fullName && registrationDoctor?.specialization) {
      const specializationSynonyms = this.enrichSpecializationWithSynonyms(
        registrationDoctor.specialization.toLowerCase(),
      );
      parts.push(
        `Pendaftaran ini ditujukan kepada ${registrationDoctor.fullName}, ` +
          `dokter spesialis ${specializationSynonyms}.`,
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
      const statusMap = {
        completed: 'selesai, sudah diperiksa, pemeriksaan tuntas',
        pending: 'menunggu, belum diperiksa, dalam antrian',
        cancelled: 'dibatalkan, tidak jadi diperiksa',
        in_progress: 'sedang berlangsung, sedang diperiksa, dalam pemeriksaan',
      };
      const statusText = statusMap[examination.status] || examination.status;
      parts.push(`Pemeriksaan ini berstatus ${statusText}.`);
    }

    if (examination.diagnosisSummary) {
      const diagnosisWithSynonyms = this.enrichDiagnosisWithSynonyms(examination.diagnosisSummary);
      parts.push(`Pasien didiagnosis dengan ${diagnosisWithSynonyms}.`);
    }

    if (examination.doctorNotes) {
      parts.push(`Berdasarkan catatan dokter: ${examination.doctorNotes}`);
    }

    const examinationDoctor = examination.doctorId || examination.doctor;
    if (examinationDoctor?.fullName && examinationDoctor?.specialization) {
      const specializationSynonyms = this.enrichSpecializationWithSynonyms(
        examinationDoctor.specialization.toLowerCase(),
      );
      parts.push(
        `Pemeriksaan ini ditangani oleh ${examinationDoctor.fullName}, ` +
          `seorang dokter spesialis ${specializationSynonyms}.`,
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
      const dayMap = {
        Senin: 'Senin, hari Senin, awal minggu',
        Selasa: 'Selasa, hari Selasa',
        Rabu: 'Rabu, hari Rabu, tengah minggu',
        Kamis: 'Kamis, hari Kamis',
        Jumat: 'Jumat, hari Jumat',
        Sabtu: 'Sabtu, hari Sabtu, akhir pekan',
        Minggu: 'Minggu, hari Minggu, akhir pekan',
      };
      const dayText = dayMap[schedule.dayOfWeek] || schedule.dayOfWeek;
      parts.push(
        `Jadwal praktik berlangsung pada ${dayText}, ` +
          `dari pukul ${schedule.startTime} hingga ${schedule.endTime}.`,
      );
    }

    if (schedule.quota !== undefined) {
      parts.push(
        `Kuota pasien yang tersedia pada jadwal ini adalah ${schedule.quota} orang. Pasien dapat mendaftar untuk pemeriksaan pada jadwal ini.`,
      );
    }

    const scheduleDoctor = schedule.doctorId || schedule.doctor;
    if (scheduleDoctor?.fullName && scheduleDoctor?.specialization) {
      const specializationSynonyms = this.enrichSpecializationWithSynonyms(
        scheduleDoctor.specialization.toLowerCase(),
      );
      parts.push(
        `Jadwal praktik ini milik ${scheduleDoctor.fullName}, ` +
          `dokter dengan spesialisasi ${specializationSynonyms}.`,
      );
    } else if (scheduleDoctor?.fullName) {
      parts.push(`Jadwal praktik ini milik dokter ${scheduleDoctor.fullName}.`);
    }

    return parts.join('\n\n');
  }

  /**
   * Build embedding text for clinic info data
   */
  buildClinicInfoEmbeddingText(clinicInfo: any): string {
    const parts: string[] = [];

    if (clinicInfo.title) {
      parts.push(`Informasi: ${clinicInfo.title}`);
    }

    if (clinicInfo.category) {
      const categoryMap = {
        open_hours: 'Jam Operasional',
        examination_flow: 'Alur Pemeriksaan',
        services: 'Layanan Klinik',
        registration_info: 'Informasi Pendaftaran',
      };
      const categoryName = categoryMap[clinicInfo.category] || clinicInfo.category;
      parts.push(`Kategori: ${categoryName}`);
    }

    if (clinicInfo.content) {
      parts.push(clinicInfo.content);
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
      case 'clinic_info':
      case 'clinicinfos':
        return this.buildClinicInfoEmbeddingText(doc);
      default:
        return JSON.stringify(doc).substring(0, 200);
    }
  }

  /**
   * Enrich diagnosis with medical synonyms and related terms
   */
  private enrichDiagnosisWithSynonyms(diagnosis: string): string {
    const diagnosisSynonyms: Record<string, string> = {
      hipertensi: 'hipertensi, tekanan darah tinggi, darah tinggi, penyakit tekanan darah',
      'hipertensi esensial': 'hipertensi esensial, tekanan darah tinggi primer, darah tinggi',
      aritmia: 'aritmia, aritmia jantung, gangguan irama jantung, detak jantung tidak teratur',
      migren: 'migren, migrain, sakit kepala migren, sakit kepala berdenyut',
      demam: 'demam, panas badan, suhu tubuh tinggi, demam tinggi',
      'infeksi saluran pernapasan':
        'infeksi saluran pernapasan, ISPA, infeksi pernafasan, batuk pilek',
      'nyeri dada': 'nyeri dada, sakit dada, chest pain, nyeri thoraks',
      'sakit kepala': 'sakit kepala, headache, pusing kepala, nyeri kepala',
      alergi: 'alergi, reaksi alergi, hipersensitivitas, alergen',
      'rinitis alergi': 'rinitis alergi, alergi hidung, pilek alergi, hidung berair',
      vertigo: 'vertigo, pusing berputar, pusing berputar-putar, gangguan keseimbangan',
      diabetes: 'diabetes, diabetes melitus, gula darah tinggi, penyakit gula',
      kolesterol: 'kolesterol, kolesterol tinggi, dislipidemia, lemak darah tinggi',
      asma: 'asma, sesak napas, penyakit asma, bronkitis asmatik',
      gastritis: 'gastritis, maag, radang lambung, sakit perut',
      pneumonia: 'pneumonia, radang paru, infeksi paru, paru-paru basah',
    };

    const diagnosisLower = diagnosis.toLowerCase();
    for (const [key, synonyms] of Object.entries(diagnosisSynonyms)) {
      if (diagnosisLower.includes(key)) {
        return `${diagnosis} (${synonyms})`;
      }
    }

    return diagnosis;
  }

  /**
   * Enrich specialization with medical synonyms and related terms
   */
  private enrichSpecializationWithSynonyms(specialization: string): string {
    const specializationSynonyms: Record<string, string> = {
      kardiologi: 'kardiologi, ahli jantung, dokter jantung, spesialis jantung, penyakit jantung',
      cardiology: 'cardiology, kardiologi, ahli jantung, dokter jantung, spesialis jantung',
      neurologi: 'neurologi, ahli saraf, dokter saraf, spesialis saraf, penyakit saraf',
      neurology: 'neurology, neurologi, ahli saraf, dokter saraf, spesialis saraf',
      pediatri: 'pediatri, dokter anak, spesialis anak, ahli kesehatan anak',
      pediatrics: 'pediatrics, pediatri, dokter anak, spesialis anak',
      'obstetrics and gynecology':
        'obstetrics and gynecology, obstetri dan ginekologi, dokter kandungan, spesialis kandungan, ahli kebidanan, dokter obgyn, spesialis obgyn, kandungan, kebidanan, ginekologi, gynecology',
      'obstetri dan ginekologi':
        'obstetri dan ginekologi, obstetrics and gynecology, dokter kandungan, spesialis kandungan, ahli kebidanan, kandungan, kebidanan',
      obstetri: 'obstetri, dokter kandungan, spesialis kandungan, ahli kebidanan, kandungan',
      obstetrics:
        'obstetrics, obstetri, dokter kandungan, spesialis kandungan, gynecology, kandungan',
      gynecology:
        'gynecology, ginekologi, dokter kandungan, spesialis kandungan, ahli kebidanan, kandungan',
      ginekologi: 'ginekologi, gynecology, dokter kandungan, spesialis kandungan, kandungan',
      kandungan:
        'kandungan, dokter kandungan, spesialis kandungan, obstetri, gynecology, kebidanan',
      dermatologi: 'dermatologi, dokter kulit, spesialis kulit, ahli penyakit kulit',
      dermatology: 'dermatology, dermatologi, dokter kulit, spesialis kulit',
      oftalmologi: 'oftalmologi, dokter mata, spesialis mata, ahli penyakit mata',
      ophthalmology: 'ophthalmology, oftalmologi, dokter mata, spesialis mata',
      otolaringologi: 'otolaringologi, dokter THT, spesialis THT, ahli telinga hidung tenggorokan',
      otolaryngology: 'otolaryngology, otolaringologi, dokter THT, spesialis THT',
      orthopedi: 'orthopedi, dokter tulang, spesialis tulang, ahli penyakit tulang',
      orthopedics: 'orthopedics, orthopedi, dokter tulang, spesialis tulang',
      urologi: 'urologi, dokter urologi, spesialis urologi, ahli penyakit saluran kemih',
      urology: 'urology, urologi, dokter urologi, spesialis urologi',
      gastroenterologi:
        'gastroenterologi, dokter pencernaan, spesialis pencernaan, ahli penyakit lambung',
      gastroenterology:
        'gastroenterology, gastroenterologi, dokter pencernaan, spesialis pencernaan',
      pulmonologi: 'pulmonologi, dokter paru, spesialis paru, ahli penyakit paru',
      pulmonology: 'pulmonology, pulmonologi, dokter paru, spesialis paru',
      psikiatri: 'psikiatri, dokter jiwa, spesialis jiwa, ahli kesehatan mental',
      psychiatry: 'psychiatry, psikiatri, dokter jiwa, spesialis jiwa',
      onkologi: 'onkologi, dokter kanker, spesialis kanker, ahli penyakit kanker',
      oncology: 'oncology, onkologi, dokter kanker, spesialis kanker',
      reumatologi: 'reumatologi, dokter rematik, spesialis rematik, ahli penyakit sendi',
      rheumatology: 'rheumatology, reumatologi, dokter rematik, spesialis rematik',
      endokrinologi: 'endokrinologi, dokter endokrin, spesialis hormon, ahli penyakit hormon',
      endocrinology: 'endocrinology, endokrinologi, dokter endokrin, spesialis hormon',
      'general surgery': 'general surgery, bedah umum, dokter bedah, spesialis bedah',
      'allergy and immunology': 'allergy and immunology, alergi, imunologi, spesialis alergi',
    };

    const specializationLower = specialization.toLowerCase();
    for (const [key, synonyms] of Object.entries(specializationSynonyms)) {
      if (specializationLower.includes(key)) {
        return `${specialization} (${synonyms})`;
      }
    }

    return specialization;
  }
}

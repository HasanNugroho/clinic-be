import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Examination } from './schemas/examination.schema';
import { CreateExaminationDto } from './dto/create-examination.dto';
import { UpdateExaminationDto } from './dto/update-examination.dto';
import { QueryExaminationDto } from './dto/query-examination.dto';
import { UsersService } from '../users/users.service';
import { RegistrationsService } from '../registrations/registrations.service';
import { UserRole } from '../users/schemas/user.schema';
import { EmbeddingService } from '../../common/services/embedding/embedding.service';

@Injectable()
export class ExaminationsService {
  constructor(
    @InjectModel(Examination.name)
    private examinationModel: Model<Examination>,
    private usersService: UsersService,
    private registrationsService: RegistrationsService,
    private embeddingService: EmbeddingService,
  ) { }

  async create(createExaminationDto: CreateExaminationDto): Promise<Examination> {
    // Validate registration exists
    const registration = await this.registrationsService.findOne(
      createExaminationDto.registrationId,
    );
    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    // Validate patient exists and has PATIENT role
    const patient = await this.usersService.findOne(createExaminationDto.patientId);
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new BadRequestException('Invalid patient ID or user is not a patient');
    }

    // Validate doctor exists and has DOCTOR role
    const doctor = await this.usersService.findOne(createExaminationDto.doctorId);
    if (!doctor || doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException('Invalid doctor ID or user is not a doctor');
    }

    // Validate that the registration belongs to the patient and doctor
    if (registration.patientId.toString() !== createExaminationDto.patientId) {
      throw new BadRequestException('Registration does not belong to the specified patient');
    }

    if (registration.doctorId.toString() !== createExaminationDto.doctorId) {
      throw new BadRequestException('Registration does not belong to the specified doctor');
    }

    // Parse examination date
    const examinationDate = new Date(createExaminationDto.examinationDate);

    // Create examination
    const createdExamination = new this.examinationModel({
      registrationId: new Types.ObjectId(createExaminationDto.registrationId),
      doctorId: new Types.ObjectId(createExaminationDto.doctorId),
      patientId: new Types.ObjectId(createExaminationDto.patientId),
      examinationDate: examinationDate,
      diagnosisSummary: createExaminationDto.diagnosisSummary,
      doctorNotes: createExaminationDto.doctorNotes,
      status: createExaminationDto.status,
    });

    const savedExamination = await createdExamination.save();

    // Generate embedding asynchronously
    this.generateAndSaveEmbedding(savedExamination._id.toString()).catch((error) => {
      console.error(`Failed to generate embedding for examination ${savedExamination._id}:`, error);
    });

    return savedExamination.toJSON();
  }

  async findAll(queryDto: QueryExaminationDto): Promise<{ data: Examination[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'examinationDate',
      sortOrder = 'desc',
      search,
      status,
      dateFrom,
      dateTo,
    } = queryDto;

    const pipeline: any[] = [];

    // ========= MATCH FILTER =========
    const match: any = {};

    if (status) match.status = status;

    // Date range filter
    if (dateFrom || dateTo) {
      match.examinationDate = {};
      if (dateFrom) match.examinationDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        match.examinationDate.$lte = toDate;
      }
    }

    // Search
    if (search) {
      match.$or = [
        { diagnosisSummary: { $regex: search, $options: 'i' } },
        { doctorNotes: { $regex: search, $options: 'i' } },
      ];
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    // ========= LOOKUPS =========
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient',
        },
      },
      { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'registrations',
          localField: 'registrationId',
          foreignField: '_id',
          as: 'registration',
        },
      },
      { $unwind: { path: '$registration', preserveNullAndEmptyArrays: true } },
    );

    // ========= PROJECT =========
    pipeline.push({
      $project: {
        _id: 1,
        examinationDate: 1,
        diagnosisSummary: 1,
        doctorNotes: 1,
        status: 1,
        doctor: {
          _id: 1,
          fullName: 1,
          specialization: 1,
        },
        patient: {
          _id: 1,
          fullName: 1,
          email: 1,
          phoneNumber: 1,
        },
        registration: {
          _id: 1,
          patientName: 1,
          doctorName: 1,
        },
      },
    });

    // ========= SORT OPTIONS =========
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // ========= FACET =========
    pipeline.push({
      $facet: {
        data: [{ $sort: sortOptions }, { $skip: skip }, { $limit: limit }],
        totalData: [{ $count: 'count' }],
      },
    });

    // ========= PROJECT =========
    pipeline.push({
      $project: {
        data: {
          _id: 1,
          examinationDate: 1,
          diagnosisSummary: 1,
          doctorNotes: 1,
          status: 1,
          doctor: {
            _id: 1,
            fullName: 1,
            specialization: 1,
          },
          patient: {
            _id: 1,
            fullName: 1,
            email: 1,
            phoneNumber: 1,
          },
          registration: {
            _id: 1,
            patientName: 1,
            doctorName: 1,
          },
        },
        total: { $ifNull: [{ $arrayElemAt: ['$totalData.count', 0] }, 0] },
      },
    });

    // ========= EXECUTE =========
    const result = await this.examinationModel.aggregate(pipeline).exec();

    return {
      data: result[0]?.data || [],
      total: result[0]?.total || 0,
    };
  }

  async findOne(id: string): Promise<Examination> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid examination ID');
    }

    const examination = await this.examinationModel
      .findById(id)
      .populate('registration')
      .populate('doctor')
      .populate('patient')
      .exec();

    if (!examination) {
      throw new NotFoundException(`Examination with ID ${id} not found`);
    }

    return examination.toJSON();
  }

  async findByPatientId(patientId: string): Promise<Examination[]> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID');
    }

    const data = await this.examinationModel
      .find({ patientId: new Types.ObjectId(patientId) })
      .populate('registration')
      .populate('doctor')
      .sort({ examinationDate: -1 })
      .exec();

    return data.map((item) => item.toObject());
  }

  async findByDoctorId(doctorId: string, date?: string): Promise<Examination[]> {
    if (!Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('Invalid doctor ID');
    }

    const query: any = { doctorId: new Types.ObjectId(doctorId) };

    if (date) {
      const examinationDate = new Date(date);
      examinationDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(examinationDate);
      nextDay.setDate(nextDay.getDate() + 1);

      query.examinationDate = {
        $gte: examinationDate,
        $lt: nextDay,
      };
    }

    const data = await this.examinationModel
      .find(query)
      .populate('registration')
      .populate('patient')
      .sort({ examinationDate: -1 })
      .exec();

    return data.map((item) => item.toObject());
  }

  async findByRegistrationId(registrationId: string): Promise<Examination[]> {
    if (!Types.ObjectId.isValid(registrationId)) {
      throw new BadRequestException('Invalid registration ID');
    }

    return this.examinationModel
      .find({ registrationId: new Types.ObjectId(registrationId) })
      .populate('doctorId')
      .populate('patientId')
      .sort({ examinationDate: -1 })
      .exec();
  }

  async update(id: string, updateExaminationDto: UpdateExaminationDto): Promise<Examination> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid examination ID');
    }

    const updateData: any = { ...updateExaminationDto };

    if (updateExaminationDto.examinationDate) {
      updateData.examinationDate = new Date(updateExaminationDto.examinationDate);
    }

    const updatedExamination = await this.examinationModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('registrationId')
      .populate('doctorId', 'fullName specialization')
      .populate('patientId', 'fullName email phoneNumber')
      .exec();

    if (!updatedExamination) {
      throw new NotFoundException(`Examination with ID ${id} not found`);
    }

    // Regenerate embedding asynchronously
    this.generateAndSaveEmbedding(id).catch((error) => {
      console.error(`Failed to regenerate embedding for examination ${id}:`, error);
    });

    return updatedExamination;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid examination ID');
    }

    const result = await this.examinationModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Examination with ID ${id} not found`);
    }
  }

  /**
   * Build embedding text for an examination
   * Combines diagnosis and doctor notes for RAG indexing
   * @param examination - Examination document with populated references
   * @returns Embedding text string
   */
  buildEmbeddingText(examination: any): string {
    const fields: Record<string, any> = {};

    // Add examination metadata
    if (examination.examinationDate) {
      fields['examination_date'] = examination.examinationDate.toISOString().split('T')[0];
    }
    if (examination.status) {
      fields['status'] = examination.status;
    }

    // Add diagnosis and notes (core medical data)
    if (examination.diagnosisSummary) {
      fields['diagnosis_summary'] = examination.diagnosisSummary;
    }
    if (examination.doctorNotes) {
      fields['doctor_notes'] = examination.doctorNotes;
    }

    // Add doctor information (if populated)
    if (examination.doctorId && typeof examination.doctorId === 'object') {
      if (examination.doctorId.fullName) {
        fields['doctor_name'] = examination.doctorId.fullName;
      }
      if (examination.doctorId.specialization) {
        fields['doctor_specialization'] = examination.doctorId.specialization;
      }
    }

    return this.embeddingService.buildEmbeddingText(fields);
  }

  /**
   * Generate and save embedding for an examination
   * @param examinationId - ID of examination to embed
   */
  async generateAndSaveEmbedding(examinationId: string): Promise<void> {
    try {
      const examination = await this.examinationModel
        .findById(examinationId)
        .populate('doctorId', 'fullName specialization')
        .populate('registrationId')
        .exec();

      if (!examination) {
        throw new NotFoundException(`Examination with ID ${examinationId} not found`);
      }

      const embeddingText = this.buildEmbeddingText(examination);
      const embedding = await this.embeddingService.generateEmbedding(embeddingText);

      await this.examinationModel
        .findByIdAndUpdate(
          examinationId,
          {
            embedding,
            embeddingText,
            embeddingUpdatedAt: new Date(),
          },
          { new: true },
        )
        .exec();
    } catch (error) {
      throw new Error(
        `Failed to generate embedding for examination ${examinationId}: ${error.message}`,
      );
    }
  }

  /**
   * Generate embeddings for multiple examinations
   * @param examinationIds - Array of examination IDs
   */
  async generateBatchEmbeddings(examinationIds: string[]): Promise<void> {
    for (const examinationId of examinationIds) {
      try {
        await this.generateAndSaveEmbedding(examinationId);
      } catch (error) {
        console.error(`Error generating embedding for examination ${examinationId}:`, error);
      }
    }
  }

  /**
   * Bulk import examinations from JSON data
   */
  async bulkImport(examinations: any[]): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const examData of examinations) {
      try {
        // Find patient by email
        const patient = await this.usersService.findByEmail(examData.patientEmail);
        if (!patient || patient.role !== UserRole.PATIENT) {
          failed++;
          errors.push({ patientEmail: examData.patientEmail, error: 'Patient not found or invalid role' });
          continue;
        }

        // Find doctor by email
        const doctor = await this.usersService.findByEmail(examData.doctorEmail);
        if (!doctor || doctor.role !== UserRole.DOCTOR) {
          failed++;
          errors.push({ doctorEmail: examData.doctorEmail, error: 'Doctor not found or invalid role' });
          continue;
        }

        // Create examination
        const created = await this.examinationModel.create({
          patientId: patient._id,
          doctorId: doctor._id,
          examinationDate: new Date(examData.examinationDate),
          diagnosisSummary: examData.diagnosisSummary,
          doctorNotes: examData.doctorNotes,
          status: examData.status,
        });

        // Generate embedding asynchronously
        this.generateAndSaveEmbedding(created._id.toString()).catch(() => null);

        success++;
      } catch (error) {
        failed++;
        errors.push({
          patientEmail: examData.patientEmail,
          doctorEmail: examData.doctorEmail,
          error: error.message
        });
      }
    }

    return { success, failed, errors };
  }
}

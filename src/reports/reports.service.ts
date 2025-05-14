import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Report, ReportDocument } from './schemas/report.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(createReportDto: CreateReportDto): Promise<Report> {
    try {
      this.logger.log(`Creating report: ${createReportDto.title}`);
      const createdReport = new this.reportModel(createReportDto);
      return createdReport.save();
    } catch (error) {
      this.logger.error(`Error creating report: ${error.message}`, error.stack);
      throw new HttpException('Failed to create report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(): Promise<Report[]> {
    try {
      this.logger.log('Finding all reports');
      return this.reportModel.find().sort({ date: -1 }).exec();
    } catch (error) {
      this.logger.error(`Error finding all reports: ${error.message}`, error.stack);
      throw new HttpException('Failed to fetch reports', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(id: string): Promise<Report> {
    try {
      this.logger.log(`Finding report with id: ${id}`);
      const report = await this.reportModel.findById(id).exec();
      if (!report) {
        throw new HttpException('Report not found', HttpStatus.NOT_FOUND);
      }
      return report;
    } catch (error) {
      this.logger.error(`Error finding report ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(id: string, updateReportDto: UpdateReportDto): Promise<Report> {
    try {
      this.logger.log(`Updating report with id: ${id}`);
      const updatedReport = await this.reportModel
        .findByIdAndUpdate(id, updateReportDto, { new: true })
        .exec();
      if (!updatedReport) {
        throw new HttpException('Report not found', HttpStatus.NOT_FOUND);
      }
      return updatedReport;
    } catch (error) {
      this.logger.error(`Error updating report ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to update report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Removing report with id: ${id}`);
      const result = await this.reportModel.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new HttpException('Report not found', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      this.logger.error(`Error removing report ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to delete report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateAnalysis(id: string, aiAnalysis: any): Promise<Report> {
    try {
      this.logger.log(`Updating analysis for report with id: ${id}`);
      const updatedReport = await this.reportModel
        .findByIdAndUpdate(id, { aiAnalysis }, { new: true })
        .exec();
      if (!updatedReport) {
        throw new HttpException('Report not found', HttpStatus.NOT_FOUND);
      }
      return updatedReport;
    } catch (error) {
      this.logger.error(`Error updating analysis for report ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to update report analysis', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Phương thức để lấy dữ liệu từ các endpoint khác
  async fetchPaymentStats(): Promise<any> {
    try {
      const baseUrl = this.configService.get<string>('API_BASE_PAYMENT_URL') || 'https://payment.eduforge.io.vn';
      this.logger.log(`Fetching payment stats from ${baseUrl}/payment/stats`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/payment/stats`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching payment stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to fetch payment stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchEnrollmentStats(): Promise<any> {
    try {
      const baseUrl = this.configService.get<string>('API_BASE_ENROLLMENT_URL') || 'https://enrollment.eduforge.io.vn';
      this.logger.log(`Fetching enrollment stats from ${baseUrl}/enrollment/stats`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/enrollment/stats`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching enrollment stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to fetch enrollment stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchCourseStats(): Promise<any> {
    try {
      const baseUrl = this.configService.get<string>('API_BASE_COURSE_URL') || 'https://courses.eduforge.io.vn';
      this.logger.log(`Fetching course stats from ${baseUrl}/courses/stats`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/courses/stats`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching course stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to fetch course stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Phương thức để tạo báo cáo tự động từ các endpoint khác
  async generateReport(userId: string): Promise<Report> {
    try {
      this.logger.log(`Generating report for user ${userId}`);
      
      // Lấy dữ liệu từ các endpoint
      const paymentStats = await this.fetchPaymentStats();
      const enrollmentStats = await this.fetchEnrollmentStats();
      const courseStats = await this.fetchCourseStats();

      // Tạo dữ liệu báo cáo
      const reportData = {
        revenue: {
          total: paymentStats.totalRevenue,
          last30Days: paymentStats.revenueLast30Days,
          averageTransaction: paymentStats.averageTransactionValue,
          failedRate: paymentStats.failedTransactionsRate,
          byMethod: paymentStats.paymentMethodsBreakdown,
        },
        enrollments: {
          total: enrollmentStats.totalEnrollments,
          last30Days: enrollmentStats.newEnrollmentsLast30Days,
          dropoutRate: enrollmentStats.dropoutRate,
          byCourse: enrollmentStats.enrollmentsByCourse,
          averageTimeToComplete: enrollmentStats.averageTimeToComplete,
          completionRate: enrollmentStats.averageCompletionRate,
        },
        courses: {
          total: courseStats.totalCourses,
          active: courseStats.activeCourses,
          // completionRate: courseStats.averageCompletionRate,
          // popular: courseStats.popularCourses,
          // viewsLast30Days: courseStats.viewsLast30Days,
        },
      };

      // Tạo báo cáo mới
      const now = new Date();
      const createReportDto: CreateReportDto = {
        title: `Báo cáo tự động - ${now.toLocaleDateString('vi-VN')}`,
        date: now.toISOString(),
        data: reportData,
        isAutoGenerated: true,
        generatedBy: userId,
      };

      return this.create(createReportDto);
    } catch (error) {
      this.logger.error(`Error generating report: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to generate report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

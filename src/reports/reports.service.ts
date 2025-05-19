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
        this.httpService.get(`${baseUrl}/payments/get/stats`),
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
        this.httpService.get(`${baseUrl}/enrollment/get/stats`),
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
          total: paymentStats.totalRevenue,         // Tổng doanh thu
          last30Days: paymentStats.revenueLast30Days, // Doanh thu 30 ngày gần nhất
          averageTransaction: paymentStats.averageTransactionValue, // Giá trị trung bình mỗi giao dịch
          failedRate: paymentStats.failedTransactionsRate, // Tỷ lệ giao dịch thất bại
          byMethod: paymentStats.paymentMethodsBreakdown, // Phân tích theo phương thức thanh toán
          monthly: paymentStats.monthlyRevenue || this.generateDefaultMonthlyRevenueData(), // Doanh thu theo tháng
        },
        enrollments: {
          total: enrollmentStats.totalEnrollments, // Tổng số lượt đăng ký
          last30Days: enrollmentStats.newEnrollmentsLast30Days, // Số lượt đăng ký mới trong 30 ngày
          dropoutRate: enrollmentStats.dropoutRate, // Tỷ lệ học viên bỏ học
          byCourse: enrollmentStats.enrollmentsByCourse, // Số lượt đăng ký theo khóa học
          averageTimeToComplete: enrollmentStats.averageTimeToComplete, // Thời gian trung bình để hoàn thành khóa học
          completionRate: enrollmentStats.averageCompletionRate, // Tỷ lệ hoàn thành khóa học
          popularCourses: enrollmentStats.popularCourses, // Các khóa học phổ biến nhất
          monthly: enrollmentStats.monthlyEnrollments || this.generateDefaultMonthlyEnrollmentData(), // Số lượt đăng ký theo tháng
        },
        courses: {
          total: courseStats.totalCourses, // Tổng số khóa học
          active: courseStats.activeCourses, // Số khóa học đang hoạt động
        },
        monthlyStats: this.generateMonthlyComparisonData(
          paymentStats.monthlyRevenue, 
          enrollmentStats.monthlyEnrollments
        ), // Dữ liệu so sánh theo tháng giữa doanh thu và số lượt đăng ký
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
   // Phương thức hỗ trợ để tạo dữ liệu doanh thu mẫu theo tháng nếu API không trả về
  private generateDefaultMonthlyRevenueData(): any[] {
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', 
                   '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
    
    return months.map((month) => {
      // Tạo dữ liệu mẫu với giá trị ngẫu nhiên từ 5000 đến 15000
      return {
        month,
        total: Math.floor(Math.random() * 10000) + 5000,
      };
    });
  }
  
  // Phương thức hỗ trợ để tạo dữ liệu đăng ký mẫu theo tháng nếu API không trả về
  private generateDefaultMonthlyEnrollmentData(): any[] {
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', 
                   '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
    
    return months.map((month) => {
      // Tạo dữ liệu mẫu với giá trị ngẫu nhiên từ 100 đến 300
      return {
        month,
        total: Math.floor(Math.random() * 200) + 100,
      };
    });
  }
  
  // Phương thức để tạo dữ liệu so sánh giữa các tháng
  private generateMonthlyComparisonData(revenueData: any[] = [], enrollmentData: any[] = []): any[] {
    // Nếu không có dữ liệu, tạo dữ liệu mẫu
    if (!revenueData || !enrollmentData || revenueData.length === 0 || enrollmentData.length === 0) {
      const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
      return months.map(month => {
        return {
          name: month,
          Doanh_thu: Math.floor(Math.random() * 10000) + 5000,
          Học_viên: Math.floor(Math.random() * 200) + 100,
        };
      });
    }
    
    // Chuyển đổi dữ liệu từ API thành định dạng phù hợp cho biểu đồ
    return revenueData.map(revItem => {
      // Tìm dữ liệu đăng ký tương ứng với tháng
      const enrollItem = enrollmentData.find(item => item.month === revItem.month) || { total: 0 };
      
      // Lấy tháng từ chuỗi YYYY-MM
      const monthNum = parseInt(revItem.month.split('-')[1]);
      const monthName = `T${monthNum}`;
      
      return {
        name: monthName,
        Doanh_thu: revItem.total,
        Học_viên: enrollItem.total,
      };
    });
  }
}

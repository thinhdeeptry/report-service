import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createReportDto: CreateReportDto) {
    this.logger.log(`Creating report: ${createReportDto.title}`);
    return this.reportsService.create(createReportDto);
  }

  @Get()
  findAll() {
    this.logger.log('Finding all reports');
    return this.reportsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logger.log(`Finding report with id: ${id}`);
    return this.reportsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateReportDto: UpdateReportDto) {
    this.logger.log(`Updating report with id: ${id}`);
    return this.reportsService.update(id, updateReportDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    this.logger.log(`Removing report with id: ${id}`);
    return this.reportsService.remove(id);
  }

  @Post(':id/analysis')
  updateAnalysis(@Param('id') id: string, @Body() aiAnalysis: any) {
    this.logger.log(`Updating analysis for report with id: ${id}`);
    return this.reportsService.updateAnalysis(id, aiAnalysis);
  }

  @Post('generate')
  generateReport(@Body() body: { userId: string }) {
    const userId = body.userId || 'system';
    this.logger.log(`Generating report for user: ${userId}`);
    return this.reportsService.generateReport(userId);
  }
}

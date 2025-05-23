import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  data: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  aiAnalysis: any;

  @Prop({ default: false })
  isAutoGenerated: boolean;

  @Prop()
  generatedBy: string;

  @Prop({ default: 'PENDING' })
  status: string; // PENDING, COMPLETED, FAILED
}

export const ReportSchema = SchemaFactory.createForClass(Report);

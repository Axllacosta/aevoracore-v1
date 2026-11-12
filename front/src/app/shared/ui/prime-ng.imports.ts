import { CommonModule } from '@angular/common';
import { CustomerInputDirective } from '../directives/customer-input.directive';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { PaginatorModule } from 'primeng/paginator';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { TabsModule } from 'primeng/tabs';
export const UI = [
  CustomerInputDirective,
  CommonModule,
  ReactiveFormsModule,
  FormsModule,
  ButtonModule,
  TableModule,
  InputTextModule,
  TextareaModule,
  InputNumberModule,
  SelectModule,
  DialogModule,
  TagModule,
  MessageModule,
  CardModule,
  ToolbarModule,
  PaginatorModule,
  DatePickerModule,
  FileUploadModule,
  TabsModule,
];

export type FormValue = string | number | null;
export interface Option {
  disabled?: boolean;
  label: string;
  value: string | number | boolean;
}
export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'email' | 'tel';
  input?: 'digits' | 'name';
  required?: boolean;
  max?: number;
  min?: number;
  pattern?: RegExp;
  options?: () => Option[];
}
export interface Column {
  key: string;
  label: string;
  money?: boolean;
}
export interface FieldGroup {
  id: string;
  label: string;
  description: string;
  keys: string[];
}

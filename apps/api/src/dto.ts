import { BudgetCategory, OfficialGroup, PostStatus, PostType, ReportStatus, ReportType, Role } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndef = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? undefined : trim({ value }));

export const BANJAR = [
  'Banjar Kaja', 'Banjar Tengah', 'Banjar Tampak Kerep', 'Banjar Sengguan', 'Banjar Pasekan', 'Banjar Umategal',
  'Banjar Umacandi', 'Banjar Umakepuh', 'Banjar Gunung', 'Banjar Bernasi', 'Bukan warga Desa Buduk',
];
export const DOC_CATEGORIES = ['Peraturan desa', 'Peraturan perbekel', 'Laporan anggaran', 'Informasi penting'];

export class LoginDto {
  @Transform(trim) @IsString() @Length(1, 40) username: string;
  @IsString() @Length(1, 200) password: string;
}

export class ChangePasswordDto {
  @IsString() @Length(1, 200) oldPassword: string;
  @IsString() @Length(10, 200, { message: 'Kata sandi baru minimal 10 karakter' }) newPassword: string;
}

export class CreateUserDto {
  @Transform(trim) @Matches(/^[a-z0-9._]{3,40}$/, { message: 'Nama pengguna 3-40 huruf kecil, angka, titik, atau garis bawah' }) username: string;
  @Transform(trim) @IsString() @Length(3, 120) name: string;
  @IsEnum(Role) role: Role;
  @IsString() @Length(10, 200, { message: 'Kata sandi minimal 10 karakter' }) password: string;
}

export class ResetPasswordDto {
  @IsString() @Length(10, 200, { message: 'Kata sandi minimal 10 karakter' }) password: string;
}

export class ReportDto {
  @IsEnum(ReportType) type: ReportType;
  @Transform(trim) @IsString() @Length(15, 5000, { message: 'Ceritakan sedikit lebih panjang, minimal 15 huruf' }) body: string;
  @Transform(trim) @IsString() @Length(3, 120, { message: 'Tulis nama lengkap Anda' }) name: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[^0-9]/g, '') : value))
  @Matches(/^(08|628)[0-9]{8,12}$/, { message: 'Nomor WhatsApp diawali 08, contoh 0812 3456 7890' }) phone: string;
  @IsIn(BANJAR, { message: 'Pilih banjar tempat tinggal Anda' }) banjar: string;
}

export class ReportUpdateDto {
  @IsEnum(ReportStatus) status: ReportStatus;
  @IsOptional() @Transform(trim) @IsString() @Length(0, 2000) reply?: string;
}

export class PostDto {
  @IsEnum(PostType) type: PostType;
  @IsEnum(PostStatus) status: PostStatus;
  @Transform(trim) @IsString() @Length(8, 200, { message: 'Judul minimal 8 huruf' }) title: string;
  @Transform(trim) @IsString() @Length(30, 50000, { message: 'Isi kabar minimal satu atau dua kalimat' }) body: string;
  @IsOptional() @Transform(emptyToUndef) @IsDateString() eventAt?: string;
  @IsOptional() @Transform(emptyToUndef) @IsString() @Length(0, 200) eventPlace?: string;
  @IsOptional() @Transform(emptyToUndef) @IsString() @Length(0, 200) organizer?: string;
  @IsOptional() @IsIn(['1']) removeImage?: string;
}

export class PhotoDto {
  @Transform(trim) @IsString() @Length(2, 120) album: string;
  @Transform(trim) @IsString() @Length(2, 200) caption: string;
}

export class DocumentDto {
  @Transform(trim) @IsString() @Length(5, 300, { message: 'Tulis judul dokumen' }) title: string;
  @IsIn(DOC_CATEGORIES) category: string;
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100) year: number;
}

export class OfficialDto {
  @Transform(trim) @IsString() @Length(3, 120) name: string;
  @Transform(trim) @IsString() @Length(2, 120) position: string;
  @IsEnum(OfficialGroup) group: OfficialGroup;
  @Type(() => Number) @IsInt() @Min(0) @Max(999) sort: number;
}

export class BudgetLineDto {
  @IsEnum(BudgetCategory) category: BudgetCategory;
  @Transform(trim) @IsString() @Length(2, 200) label: string;
  // angka rupiah dikirim sebagai string agar aman untuk nilai miliaran
  @Matches(/^[0-9]{1,15}$/, { message: 'Hanya boleh angka' }) planned: string;
  @Matches(/^[0-9]{1,15}$/, { message: 'Hanya boleh angka' }) realized: string;
}

export class BudgetDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => BudgetLineDto) lines: BudgetLineDto[];
}

export class CountDto {
  @Transform(trim) @IsString() @Length(1, 80) label: string;
  @IsInt() @Min(0) @Max(1_000_000) n: number;
}

export class PopulationDto {
  @IsInt() @Min(0) @Max(1_000_000) male: number;
  @IsInt() @Min(0) @Max(1_000_000) female: number;
  @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => CountDto) religion: CountDto[];
  @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => CountDto) occupation: CountDto[];
  @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => CountDto) education: CountDto[];
  @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => CountDto) age: CountDto[];
}

export class ProfileDto {
  @Transform(trim) @IsString() @Length(0, 500) vision: string;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 1000, { each: true }) missions: string[];
  @Transform(trim) @IsString() @Length(0, 30000) history: string;
  @Transform(trim) @IsString() @Length(0, 2000) greeting: string;
}

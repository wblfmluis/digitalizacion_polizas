import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DownloadZipItemDto {
  @IsString()
  fileId: string;

  @IsString()
  bucketId: string;

  @IsOptional()
  @IsString()
  filename?: string;
}

export class DownloadZipDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DownloadZipItemDto)
  files: DownloadZipItemDto[];

  @IsOptional()
  @IsString()
  zipFilename?: string;
}

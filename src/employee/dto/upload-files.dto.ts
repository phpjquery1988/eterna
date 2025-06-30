import { UploadTypeEnum } from "@app/contracts/enums/upload.enum";
import { IsEnum, IsNotEmpty } from "class-validator";

export class UploadFilesDto {
   file: any;

   @IsEnum(UploadTypeEnum)
   @IsNotEmpty()
   type: UploadTypeEnum;
}

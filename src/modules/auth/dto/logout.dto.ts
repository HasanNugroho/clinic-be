import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LogoutDto {
    @ApiProperty({ description: 'Refresh token' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;

    @ApiProperty({ description: 'Access token' })
    @IsString()
    @IsNotEmpty()
    accessToken: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { PaginationOptionsDto } from './page-option.dto';

export class PageMetaDto {
    @ApiProperty()
    readonly page: number;

    @ApiProperty()
    readonly limit: number;

    @ApiProperty()
    readonly itemCount: number;

    @ApiProperty()
    readonly pageCount: number;

    @ApiProperty()
    readonly hasPreviousPage: boolean;

    @ApiProperty()
    readonly hasNextPage: boolean;

    constructor(pageOptionsDto: PaginationOptionsDto, itemCount: number) {
        this.page = pageOptionsDto.page;
        this.limit = pageOptionsDto.limit;
        this.itemCount = itemCount;
        this.pageCount = Math.ceil(this.itemCount / this.limit);
        this.hasPreviousPage = this.page > 1;
        this.hasNextPage = this.page < this.pageCount;
    }
}
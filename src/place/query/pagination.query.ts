import { IsNumberString, Max, Min } from "class-validator"

export class PaginationQuery {
    @IsNumberString()
    @Min(0)
    start: number
    @IsNumberString()
    @Min(0)
    @Max(50)
    limit: number
}
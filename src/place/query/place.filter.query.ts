import { IsNumberString, IsString, Max, Min } from "class-validator"
import { PaginationQuery } from "./pagination.query"

export class PlaceFilterQuery extends PaginationQuery {
    @IsString()
    name: string
    @IsString()
    type: string
    @IsString()
    address: string

}
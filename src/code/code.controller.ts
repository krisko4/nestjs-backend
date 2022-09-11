import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { CodeService } from './code.service';
import { CreateCodeDto } from './dto/create-code.dto';
import { CodeFilterQuery } from './queries/code-filter.query';

@Controller('codes')
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @Post()
  create(@Body() createCodeDto: CreateCodeDto) {
    return this.codeService.create(createCodeDto);
  }

  @Get()
  async find(@Query() codeFilterQuery: CodeFilterQuery) {
    const res = await this.codeService.findByQuery(codeFilterQuery);
    console.log(res);
    return res;
  }
}

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Get()
  async find(@Query() codeFilterQuery: CodeFilterQuery, @Req() req) {
    const res = await this.codeService.findByQuery(
      codeFilterQuery,
      req.user.uid,
    );
    return res;
  }
}

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
import { UseCodeDto } from './dto/use-code.dto';

@Controller('codes')
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @UseGuards(JwtAuthGuard)
  @Post('use')
  use(@Body() useCodeDto: UseCodeDto, @Req() req) {
    const { uid } = req.cookies;
    return this.codeService.use(useCodeDto, uid);
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

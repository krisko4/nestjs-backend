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

@Controller('user/codes')
export class UserCodeController {
  constructor(private readonly codeService: CodeService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createCodeDto: CreateCodeDto) {
    return this.codeService.create(createCodeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('use')
  use(@Body() useCodeDto: UseCodeDto, @Req() req) {
    const { uid } = req.cookies;
    return this.codeService.use(useCodeDto, uid);
  }
}

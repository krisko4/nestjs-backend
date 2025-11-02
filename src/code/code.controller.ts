import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  UseGuards,
  Sse,
  Param,
  MessageEvent,
} from '@nestjs/common';
import { CodeService } from './code.service';
import { CodeFilterQuery } from './queries/code-filter.query';
import { UseCodeDto } from './dto/use-code.dto';
import { CodeSseService } from './code-sse.service';
import { Observable } from 'rxjs';

@Controller('codes')
export class CodeController {
  constructor(
    private readonly codeService: CodeService,
    private readonly codeSseService: CodeSseService,
  ) {}

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

  @UseGuards(JwtAuthGuard)
  @Sse('listen/:codeValue')
  listenForCodeScan(
    @Param('codeValue') codeValue: string,
    @Req() req,
  ): Observable<MessageEvent> {
    console.log('code scanned');
    return this.codeSseService.getCodeScannedStreamByCodeValue(codeValue);
  }
}

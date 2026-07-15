import { Module, Global } from '@nestjs/common';
import { DataContextService } from './services/data-context.service';

@Global()
@Module({
  providers: [DataContextService],
  exports: [DataContextService],
})
export class CommonModule {}

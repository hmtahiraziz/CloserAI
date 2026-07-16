import { Module } from '@nestjs/common';
import { RetellClientService, RetellSignatureVerifier } from './retell.service';

@Module({
  providers: [RetellClientService, RetellSignatureVerifier],
  exports: [RetellClientService, RetellSignatureVerifier],
})
export class RetellModule {}

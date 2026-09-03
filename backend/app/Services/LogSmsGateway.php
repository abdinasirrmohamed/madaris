<?php
namespace App\Services;
use App\Contracts\SmsGateway;
class LogSmsGateway implements SmsGateway {
 public function send(string $recipient,string $message,array $configuration):array{return ['provider_id'=>'test-'.str()->uuid(),'response'=>'Accepted in SMS test mode'];}
 public function status(string $providerMessageId,array $configuration):array{return ['status'=>'sent'];}
 public function balance(array $configuration):?float{return null;}
}

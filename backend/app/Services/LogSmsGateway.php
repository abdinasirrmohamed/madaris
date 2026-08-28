<?php
namespace App\Services;
use App\Contracts\SmsGateway;use Illuminate\Support\Facades\Log;
class LogSmsGateway implements SmsGateway { public function send(string $recipient,string $message,array $configuration):array{Log::info('SMS development gateway',['recipient'=>$recipient,'message'=>$message,'provider'=>$configuration['ProviderName']??'log']);return ['provider_id'=>'log-'.str()->uuid(),'response'=>'Accepted by development log gateway'];} }

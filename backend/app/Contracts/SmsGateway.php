<?php
namespace App\Contracts;
interface SmsGateway { public function send(string $recipient,string $message,array $configuration):array; }

<?php
namespace App\Contracts;
interface SmsGateway {
 public function send(string $recipient,string $message,array $configuration):array;
 public function status(string $providerMessageId,array $configuration):array;
 public function balance(array $configuration):?float;
}

<?php

namespace App\Services;

use App\Contracts\SmsGateway;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class HttpSmsGateway implements SmsGateway
{
    public function __construct(private LogSmsGateway $testGateway) {}

    public function send(string $recipient, string $message, array $configuration): array
    {
        $isLive = ! empty($configuration['IsLive']) || (bool) config('sms.enabled');
        if (! $isLive) {
            return $this->testGateway->send($recipient, $message, $configuration);
        }

        $providerType = strtolower($configuration['ProviderType'] ?? 'generic_http');
        $url = $configuration['ApiUrl'] ?? config('sms.api_url');
        $key = $configuration['ApiKey'] ?? config('sms.api_key');
        $secret = $configuration['ApiSecret'] ?? config('sms.api_secret');
        $senderId = $configuration['SenderId'] ?? config('sms.sender_id', 'MADAARIS');
        $timeout = (int) (config('sms.timeout_seconds') ?: 15);

        if ($providerType === 'twilio') {
            return $this->sendTwilio($recipient, $message, $key, $secret, $senderId, $url, $timeout);
        }

        if (! $url) {
            throw new RuntimeException('URL-ka SMS Gateway-ga lama hayo. Fadlan gali API URL-ka qaybta SMS Settings.');
        }

        if (! $key && $providerType !== 'generic_http') {
            throw new RuntimeException('API Key ama Password lama hayo. Fadlan ku dar SMS Settings.');
        }

        return match ($providerType) {
            'hormuud' => $this->sendHormuud($url, $recipient, $message, $senderId, $key, $secret, $timeout),
            'som_sms' => $this->sendSomSms($url, $recipient, $message, $senderId, $key, $secret, $timeout),
            default => $this->sendGenericHttp($url, $recipient, $message, $senderId, $key, $secret, $timeout),
        };
    }

    private function sendGenericHttp(string $url, string $recipient, string $message, string $senderId, ?string $key, ?string $secret, int $timeout): array
    {
        $payload = [
            'to' => $recipient,
            'recipient' => $recipient,
            'mobile' => $recipient,
            'phone' => $recipient,
            'message' => $message,
            'text' => $message,
            'sender_id' => $senderId,
            'sender' => $senderId,
            'api_secret' => $secret,
            'callback_url' => config('sms.callback_url'),
        ];

        $request = Http::timeout($timeout)->acceptJson();
        if ($key) {
            $request = $request->withToken($key);
        }

        $response = $request->post($url, $payload);
        return $this->parseResponse($response, 'Generic HTTP');
    }

    private function sendHormuud(string $url, string $recipient, string $message, string $senderId, ?string $key, ?string $secret, int $timeout): array
    {
        $payload = [
            'mobile' => $recipient,
            'to' => $recipient,
            'message' => $message,
            'sender' => $senderId,
            'sender_id' => $senderId,
            'apiKey' => $key,
            'apiSecret' => $secret,
            'token' => $key,
        ];

        $request = Http::timeout($timeout)->acceptJson();
        if ($key) {
            $request = $request->withHeaders(['X-API-KEY' => $key, 'Authorization' => 'Bearer ' . $key]);
        }

        $response = $request->post($url, $payload);
        return $this->parseResponse($response, 'Hormuud SMS');
    }

    private function sendSomSms(string $url, string $recipient, string $message, string $senderId, ?string $key, ?string $secret, int $timeout): array
    {
        $payload = [
            'username' => $key,
            'password' => $secret,
            'sender' => $senderId,
            'recipient' => $recipient,
            'to' => $recipient,
            'message' => $message,
        ];

        $response = Http::timeout($timeout)->asForm()->post($url, $payload);
        return $this->parseResponse($response, 'SomSMS');
    }

    private function sendTwilio(string $recipient, string $message, ?string $sid, ?string $token, string $from, ?string $url, int $timeout): array
    {
        if (! $sid || ! $token) {
            throw new RuntimeException('Twilio Account SID iyo Auth Token waa lagama maarmaan.');
        }

        $endpoint = $url ?: "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";
        $to = str_starts_with($recipient, '+') ? $recipient : '+' . $recipient;

        $response = Http::timeout($timeout)->withBasicAuth($sid, $token)->asForm()->post($endpoint, [
            'From' => $from,
            'To' => $to,
            'Body' => $message,
        ]);

        return $this->parseResponse($response, 'Twilio');
    }

    private function parseResponse($response, string $providerName): array
    {
        $status = $response->status();
        $data = $response->json() ?? [];
        $raw = $response->body();

        if (! $response->successful()) {
            $errorMsg = $data['message'] ?? $data['error'] ?? $data['description'] ?? $data['msg'] ?? "HTTP {$status}: " . mb_substr($raw, 0, 200);
            throw new RuntimeException("SMS Provider ({$providerName}) error: {$errorMsg}");
        }

        $id = $data['message_id']
            ?? $data['id']
            ?? $data['sid']
            ?? $data['msg_id']
            ?? $data['transaction_id']
            ?? ($data['data']['id'] ?? null)
            ?? 'msg-' . str()->uuid();

        return [
            'provider_id' => (string) $id,
            'response' => json_encode([
                'provider' => $providerName,
                'status' => $data['status'] ?? 'accepted',
                'code' => $status,
                'details' => is_array($data) ? array_slice($data, 0, 5) : mb_substr($raw, 0, 100),
            ]),
        ];
    }

    public function status(string $providerMessageId, array $configuration): array
    {
        return ['status' => 'sent'];
    }

    public function balance(array $configuration): ?float
    {
        $url = $configuration['BalanceUrl'] ?? config('sms.balance_url');
        $key = $configuration['ApiKey'] ?? config('sms.api_key');
        if (! $url || ! $key) {
            return null;
        }

        try {
            $response = Http::timeout((int) (config('sms.timeout_seconds') ?: 15))->withToken($key)->get($url);
            return $response->successful() ? (float) ($response->json('balance') ?? 0) : null;
        } catch (Throwable) {
            return null;
        }
    }
}

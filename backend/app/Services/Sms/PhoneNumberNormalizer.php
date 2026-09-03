<?php

namespace App\Services\Sms;

use InvalidArgumentException;

class PhoneNumberNormalizer
{
    public function normalize(?string $phone): string
    {
        $raw = preg_replace('/[\s\-()]/', '', trim((string) $phone));
        if ($raw === '' || preg_match('/[^0-9+]/', $raw)) {
            throw new InvalidArgumentException('Phone number is missing or contains invalid characters.');
        }
        if (str_starts_with($raw, '+')) {
            $raw = substr($raw, 1);
        }
        if (str_starts_with($raw, '00')) {
            $raw = substr($raw, 2);
        }
        if (str_starts_with($raw, '0')) {
            $raw = '252'.substr($raw, 1);
        } elseif (! str_starts_with($raw, '252')) {
            $raw = '252'.$raw;
        }
        if (! preg_match('/^252\d{9}$/', $raw)) {
            throw new InvalidArgumentException('Phone number must be a valid Somali number.');
        }

        return $raw;
    }

    public function inspect(?string $phone): array
    {
        try {
            return ['valid' => true, 'normalized' => $this->normalize($phone), 'error' => null];
        } catch (InvalidArgumentException $e) {
            return ['valid' => false, 'normalized' => null, 'error' => $e->getMessage()];
        }
    }
}

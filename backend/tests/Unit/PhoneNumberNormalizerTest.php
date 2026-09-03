<?php

namespace Tests\Unit;

use App\Services\Sms\PhoneNumberNormalizer;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PhoneNumberNormalizerTest extends TestCase
{
    #[DataProvider('numbers')]
    public function test_normalizes_somali_numbers(string $input, string $expected): void
    {
        $this->assertSame($expected, (new PhoneNumberNormalizer)->normalize($input));
    }

    public static function numbers(): array
    {
        return [['0612345678', '252612345678'], ['612345678', '252612345678'], ['+252612345678', '252612345678'], ['00252612345678', '252612345678']];
    }

    public function test_rejects_invalid_number(): void
    {
        $this->expectException(InvalidArgumentException::class);
        (new PhoneNumberNormalizer)->normalize('abc-123');
    }
}
